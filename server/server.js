// backend/server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { callDifyWorkflow } = require('./difyService');
const { generateProfileSummary, ALL_QUESTIONS, COMMON_APP_PROMPTS, UC_PROMPTS } = require('./utils/profileUtils');
const ChatSession = require('./models/ChatSession');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB Atlas!'))
  .catch(err => console.error('MongoDB connection error:', err));

const DiscoveredSchema = new mongoose.Schema({
    interests: { type: [String], default: [] },
    strengths: { type: Array, default: [] },
    goals: { type: [String], default: [] },
    improvements: { type: Array, default: [] }
}, { _id: false });

const ProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  lastUpdated: { type: Date, default: Date.now },
  questionnaire: { type: Array, default: [] },
  discovered: { 
    type: DiscoveredSchema, 
    default: () => ({}) 
  },
  tracker: {
    sat: {
      current: { type: Number, default: null },
      goal: { type: Number, default: null },
      targetDate: { type: String, default: '' },
      reading: { type: Number, default: null },
      math: { type: Number, default: null }
    },
    gpa: {
      current: { type: Number, default: null },
      goal: { type: Number, default: null },
      unweighted: { type: Number, default: null },
      weighted: { type: Number, default: null }
    },
    act: {
      current: { type: Number, default: null },
      goal: { type: Number, default: null }
    },
    competitions: [{
        id: { type: String },
        name: { type: String },
        result: { type: String }
    }],
  },
  completedTasks: { type: [String], default: [] },
  schedule: {
    lastGenerated: { type: Date },
    checklist: [{
      id: { type: String, required: true },
      text: { type: String, required: true },
      status: { type: String, default: 'incomplete' },
      dueDate: { type: Date }
    }],
    catchUp: [{
      id: { type: String, required: true },
      text: { type: String, required: true },
      status: { type: String, default: 'incomplete' }
    }]
  },
  collegeList: {
      reach: { type: Array, default: [] },
      target: { type: Array, default: [] },
      likely: { type: Array, default: [] },
      lastGenerated: { type: Date }
  },
  profileSummary: { type: String, default: '' },
  applicationStrategies:{
    earlyDecision: { type:Array, default:[] },
    earlyAction: { type:Array, default:[] },
    strengthsToHighlight: { type: Object, default: {} }
  },
  essaysAndActivities: {
    commonApp: { type: Object, default: {} },
    ucQuestions: { type: Object, default: {} },
    activities: { type: Array, default: [] },
    supplementals: { type: Object, default: {} }
  }
}, { timestamps: true });

const Profile = mongoose.model('Profile', ProfileSchema);

/**
 * Calls Dify to get the "Why" reasons for a single school.
 * @param {string} profileSummary - The user's profile summary string.
 * @param {string} schoolName - The name of the school.
 * @param {string} userId - The user's ID for Dify history.
 * @returns {Promise<Array>} - An array of reason objects.
 */
const generateWhyReasons = async (profileSummary, schoolName, userId) => {
  console.log(`[INFO] Generating new 'Why' reasons via Dify for ${schoolName}`);
  const difyBody = {
      inputs: {
          "profile": profileSummary,
          "school": schoolName
      },
      response_mode: 'blocking',
      user: userId
  };

  const aiData = await callDifyWorkflow(
      process.env.DIFY_WORKFLOW_URL,
      process.env.COLLEGE_WHY_KEY,
      difyBody
  );
  return JSON.parse(aiData.data.outputs.reasoning).reasons || [];
};

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const deriveAcademicTracker = (questionnaire = [], existingTracker = {}) => {
  const aboutMeAnswers = questionnaire
    .filter(item => item && item.category === 'aboutMe')
    .reduce((acc, item) => {
      acc[item.id] = item.answer;
      return acc;
    }, {});

  const unweighted = toNumberOrNull(aboutMeAnswers.a1);
  const weighted = toNumberOrNull(aboutMeAnswers.a2);
  const satReading = toNumberOrNull(aboutMeAnswers.a3);
  const satMath = toNumberOrNull(aboutMeAnswers.a4);
  const actScore = toNumberOrNull(aboutMeAnswers.a5);

  const satCurrent = satReading !== null && satMath !== null
    ? satReading + satMath
    : (satReading ?? satMath);

  const existingSat = existingTracker.sat || {};
  const existingGpa = existingTracker.gpa || {};
  const existingAct = existingTracker.act || {};

  return {
    ...existingTracker,
    sat: {
      ...existingSat,
      current: satCurrent ?? existingSat.current ?? null,
      reading: satReading ?? existingSat.reading ?? null,
      math: satMath ?? existingSat.math ?? null,
      goal: existingSat.goal ?? null,
      targetDate: existingSat.targetDate ?? '',
    },
    gpa: {
      ...existingGpa,
      current: unweighted ?? existingGpa.current ?? null,
      goal: existingGpa.goal ?? null,
      unweighted: unweighted ?? existingGpa.unweighted ?? null,
      weighted: weighted ?? existingGpa.weighted ?? null,
    },
    act: {
      ...existingAct,
      current: actScore ?? existingAct.current ?? null,
      goal: existingAct.goal ?? null,
    },
    competitions: Array.isArray(existingTracker.competitions) ? existingTracker.competitions : [],
  };
};

const generateAiInsight = async (profile, apiKey, outputKey) => {
  const profileSummary = profile.profileSummary || await generateProfileSummary(profile);
  if (!profile.profileSummary) {
    profile.profileSummary = profileSummary; // Save summary if it was just generated
  }

  const difyBody = {
    inputs: { "profile": profileSummary },
    response_mode: 'blocking',
    user: profile.userId,
  };

  const aiData = await callDifyWorkflow(
    process.env.DIFY_WORKFLOW_URL,
    apiKey,
    difyBody
  );

  console.log(`[DIFY RESPONSE for ${outputKey}]`, JSON.stringify(aiData, null, 2));
  
  const result = aiData.data.outputs[outputKey];
  if (!Array.isArray(result)) {
      throw new Error(`AI output '${outputKey}' was not a valid array.`);
  }
  return result;
};

// --- API Routes ---

// User creation route
app.post('/api/users/create', async (req, res) => {
  console.log('--- Received request to POST /api/users/create ---');
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    console.log('[FAIL] Missing name, email, or password.');
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }

  try {
    if (await Profile.findOne({ userId: email })) {
      console.log(`[FAIL] User with email ${email} already exists.`);
      return res.status(409).json({ message: 'A user with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newProfile = new Profile({
      userId: email,
      name: name,
      password: hashedPassword,
    });

    await newProfile.save();
    console.log(`[SUCCESS] New profile created for userId: ${newProfile.userId}`);
    res.status(201).json({
      message: 'User account and profile created successfully!',
      userId: newProfile.userId,
    });
  } catch (error) {
    console.error('[ERROR] Server error during profile creation:', error);
    res.status(500).json({ message: 'Server error while creating profile.', error });
  }
});

// User sign-in route
app.post('/api/users/signin', async (req, res) => {
  console.log('--- Received request to POST /api/users/signin ---');
  const { email, password } = req.body;
  if (!email || !password) {
    console.log('[FAIL] Missing email or password.');
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const profile = await Profile.findOne({ userId: email });
    if (!profile) {
      console.log(`[FAIL] Sign-in failed. User not found: ${email}`);
      return res.status(404).json({ message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(password, profile.password);
    if (!isMatch) {
      console.log(`[FAIL] Sign-in failed. Invalid credentials for: ${email}`);
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const needsProfileSetup = !profile.questionnaire || profile.questionnaire.length === 0;

    console.log(`[SUCCESS] User signed in: ${profile.userId}`);
    res.status(200).json({
      message: 'Sign in successful!',
      userId: profile.userId,
      needsProfileSetup,
    });
  } catch (error) {
    console.error('[ERROR] Server error during sign in:', error);
    res.status(500).json({ message: 'Server error during sign in.', error });
  }
});

// GET a user's profile
app.get('/api/profile/:userId', async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.params.userId }).lean();
    if (!profile) {
      return res.status(404).json({ message: "Profile not found." });
    }

    profile.tracker = deriveAcademicTracker(profile.questionnaire, profile.tracker || {});
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error });
  }
});

// UPDATE a user's profile
app.put('/api/profile/:userId', async (req, res) => {
  const { userId } = req.params;
  const updates = req.body;
  console.log(`--- Received request to PUT /api/profile/${userId} ---`);

  try {
    const profile = await Profile.findOne({ userId: userId });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found." });
    }

    // A. Handle Questionnaire Updates
    if (updates.questionnaire) {
      const category = Object.keys(updates.questionnaire)[0];
      const answersForCategory = updates.questionnaire[category];

      // THIS IS THE KEY FIX:
      // 1. Keep all answers that are NOT in the category we're currently updating.
      const otherCategoryAnswers = profile.questionnaire.filter(q => q.category !== category);

      // 2. Format the new answers for the current category.
      const newAnswers = Object.entries(answersForCategory).map(([questionId, answerValue]) => {
        const questionObj = (ALL_QUESTIONS[category] || []).find(q => q.id === questionId);
        return {
          id: questionId,
          category: category,
          question: questionObj ? questionObj.question : questionId,
          answer: answerValue,
        };
      });

      // 3. Combine the old answers with the new ones, replacing the category.
      profile.questionnaire = [...otherCategoryAnswers, ...newAnswers];
    }
    
    // B. Handle tracker updates sent directly from the client
    if (updates.tracker) {
        profile.tracker = profile.tracker || {};
        Object.entries(updates.tracker).forEach(([key, value]) => {
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            profile.tracker[key] = { ...(profile.tracker[key] || {}), ...value };
          } else {
            profile.tracker[key] = value;
          }
        });
    }

    // C. Keep tracker fields in sync with questionnaire answers
    profile.tracker = deriveAcademicTracker(profile.questionnaire, profile.tracker || {});
    profile.markModified('tracker');

    // D. Re-generate profile summary and save all changes
    profile.profileSummary = await generateProfileSummary(profile);
    profile.lastUpdated = Date.now();
    
    await profile.save();
    console.log(`[SUCCESS] Profile updated for userId: ${userId}`);
    res.json({ message: 'Profile updated successfully!', profile });

  } catch (error) {
    console.error(`[ERROR] Error updating profile for ${userId}:`, error.message);
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
});

// GET a user's profile answers, formatted for the UI
app.get('/api/profile/:userId/answers', async (req, res) => {
  const { userId } = req.params;
  console.log(`--- Received request to GET answers for user: ${userId} ---`);

  try {
    const profile = await Profile.findOne({ userId: userId });
    if (!profile || profile.questionnaire.length === 0) {
      return res.status(404).json({ message: "No questionnaire data found for this user." });
    }

    const answersForUI = {
      priorities: {},
      interests: {},
      aboutMe: {},
      activities: []
    };

    profile.questionnaire.forEach(item => {
      if (item.category === 'activities'){
        answersForUI.activities.push(item.answer)
      }
      else if (answersForUI[item.category]) {
        // The answer is retrieved directly as a number or string
        answersForUI[item.category][item.id] = item.answer;
      }
    });
    
    console.log(`[SUCCESS] Sending formatted answers for user: ${userId}`);
    res.json(answersForUI);

  } catch (error) {
    console.error(`[ERROR] Error fetching formatted answers for ${userId}:`, error);
    res.status(500).json({ message: 'Error fetching formatted answers', error });
  }
});

app.post('/api/colleges/generate', async (req, res) => {
  const { userId } = req.body;
  console.log(`--- Received request to POST /api/colleges/generate for userId: ${userId} ---`);
  if (!userId) {
    console.log('[FAIL] User ID was not provided in the request body.');
    return res.status(400).json({ message: 'User ID is required.' });
  }

  try {
    // 1. Fetch the user's full profile from the database
    console.log(`[INFO] Fetching profile for userId: ${userId}...`);
    const profile = await Profile.findOne({ userId: userId });
    if (!profile) {
      console.log(`[FAIL] Profile not found for userId: ${userId}.`);
      return res.status(404).json({ message: "Profile not found." });
    }
    console.log('[SUCCESS] Profile fetched successfully.');
    
    // 2. Generate a fresh profile summary from the latest data
    console.log('[INFO] Generating a new AI profile summary...');
    const profileSummary = await generateProfileSummary(profile);
    
    // 3. Save the newly generated summary back to the profile for future use.
    profile.profileSummary = profileSummary;
    await profile.save();
    console.log(`[SUCCESS] New summary generated and saved for user: ${userId}`);
    
    console.log("---- Using Profile Summary for Dify ----\n", profileSummary);

    // 4. Construct the body for the Dify workflow
    const difyBody = {
        inputs: {
            "profile": profileSummary 
        },
        response_mode: 'blocking',
        user: process.env.DIFY_USER // Using the user ID from your .env for Dify logs
    };

    // 5. Call the Dify service for the college list
    console.log('[INFO] Sending request to Dify workflow for college list...');
    const aiData = await callDifyWorkflow(
        process.env.DIFY_WORKFLOW_URL,
        process.env.COLLEGE_LIST_KEY, // The API key specific to your college list workflow
        difyBody
    );
    console.log('[SUCCESS] Received response from Dify.');

    // 6. Parse the JSON string from Dify's response
    const allColleges = aiData.data.outputs.CollegeList;

    if (!Array.isArray(allColleges)) {
        console.error("[ERROR] Dify output for CollegeList was not an array.", allColleges);
        throw new Error("Received invalid data format from AI service.");
    }

    const categorizedList = {
      reach: allColleges.filter(c => c.category === 'Reach'),
      target: allColleges.filter(c => c.category === 'Target'),
      likely: allColleges.filter(c => c.category === 'Safety'), // Dify might use 'Safety'
    };

    // 7. Save the new list to the user's profile
    profile.collegeList = {
        ...categorizedList,
        lastGenerated: new Date()
    };
    await profile.save();

    console.log(`[SUCCESS] Sending categorized college list to user: ${userId}`);
    res.json(categorizedList);

  } catch (error) {
    console.error("[ERROR] College List Generation Failed:", error.message);
    res.status(500).json({ message: 'Error generating college list.' });
  }
});

app.post('/api/strategies/generate', async (req, res) => {
  const { userId } = req.body;
  console.log(`--- Received request to POST /api/strategies/generate for userId: ${userId} ---`);
  if (!userId) {
    return res.status(400).json({ message: 'User ID is required.' });
  }

  try {
    const profile = await Profile.findOne({ userId });
    if (!profile || !profile.collegeList || !profile.profileSummary) {
      return res.status(404).json({ message: "A profile with a college list and summary must exist before generating strategies." });
    }

    // 1. Format the college list into a simple string for the Dify prompt.
    let collegeListString = "Reach Schools:\n";
    profile.collegeList.reach.forEach(c => { collegeListString += `- ${c.school}\n`});
    collegeListString += "\nTarget Schools:\n";
    profile.collegeList.target.forEach(c => { collegeListString += `- ${c.school}\n`});
    collegeListString += "\nLikely Schools:\n";
    profile.collegeList.likely.forEach(c => { collegeListString += `- ${c.school}\n`});

    // 2. Construct the body for the Dify workflow.
    const difyBody = {
        inputs: {
            "profile": profile.profileSummary,
            "college_list": collegeListString
        },
        response_mode: 'blocking',
        user: userId
    };

    // 3. Call the Dify workflow using the specific API key for strategies.
    const aiData = await callDifyWorkflow(
      process.env.DIFY_WORKFLOW_URL,
      process.env.STRATEGIES_KEY,
      difyBody
    );
    
    // 4. Parse the JSON string from Dify's response.
    // Ensure the output key in your Dify workflow is named "answer".
    const strategies = aiData.data.outputs.strategy; 

    // 5. Save the new strategies to the user's profile.
    profile.applicationStrategies = strategies;
    await profile.save();
    console.log(`[SUCCESS] Saved new application strategies for user: ${userId}`);

    // 6. Send the newly generated strategies back to the frontend.
    res.json(strategies);

  } catch (error) {
    console.error("[ERROR] Strategies Generation Failed:", error.message);
    res.status(500).json({ message: 'Error generating application strategies.' });
  }
});

// POST route to generate and fetch strengths
app.post('/api/profile/:userId/analyze/strengths', async (req, res) => {
    const { userId } = req.params;
    try {
        const profile = await Profile.findOne({ userId });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });
        
        const strengths = await generateAiInsight(profile, process.env.PROFILE_STRENGTHS_KEY, 'strengths');
        
        // Save the text of the strengths to the profile for future reference
        profile.discovered.strengths = strengths;
        profile.markModified('discovered');
        await profile.save();
        console.log(`[SUCCESS] Saved new strengths for user: ${userId}`);
        
        res.json(strengths);
    } catch (error) {
        res.status(500).json({ message: 'Error generating strengths', error: error.message });
    }
});

// POST route to generate and fetch improvements
app.post('/api/profile/:userId/analyze/improvements', async (req, res) => {
  const { userId } = req.params;
  try {
    const profile = await Profile.findOne({ userId });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    const improvements = await generateAiInsight(profile, process.env.PROFILE_IMPROVEMENTS_KEY, 'improvements');
    
     profile.discovered.improvements = improvements;
     profile.markModified('discovered');
     await profile.save();
     console.log(`[SUCCESS] Saved new improvements for user: ${userId}`);
    
    res.json(improvements);
  } catch (error) {
    res.status(500).json({ message: 'Error generating improvements', error: error.message });
  }
});

// GET existing strengths from the database
app.get('/api/profile/:userId/strengths', async (req, res) => {
  const { userId } = req.params;
  try {
    const profile = await Profile.findOne({ userId });
    // Check if the profile and the specific data exist and are not empty
    if (profile && profile.discovered && profile.discovered.strengths && profile.discovered.strengths.length > 0) {
      res.json(profile.discovered.strengths);
    } else {
      // If no data is found, send a 404 so the frontend knows to generate it
      res.status(404).json({ message: 'No saved strengths found.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching strengths', error: error.message });
  }
});

// GET existing improvements from the database
app.get('/api/profile/:userId/improvements', async (req, res) => {
  const { userId } = req.params;
  try {
    const profile = await Profile.findOne({ userId });
    // Check if the profile and the specific data exist and are not empty
    if (profile && profile.discovered && profile.discovered.improvements && profile.discovered.improvements.length > 0) {
      res.json(profile.discovered.improvements);
    } else {
      // If no data is found, send a 404
      res.status(404).json({ message: 'No saved improvements found.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching improvements', error: error.message });
  }
});

app.get('/api/profile/:userId/schedule', async (req, res) => {
  const { userId } = req.params;
  try{
    const profile = await Profile.findOne({ userId });
    if (!profile){
      return res.status(404).json({ message: 'Profile not found' });
    }
    const twoWeeksAgo = new Date(Date.now() - 14 * 24* 60 * 60 * 1000);
    const scheduleExists = profile.schedule && profile.schedule.lastGenerated;
    if (scheduleExists && profile.schedule.lastGenerated > twoWeeksAgo && profile.schedule.checklist.length > 0) {
      console.log(`[INFO] Returning fresh schedule for user: ${userId}`);
      return res.json(profile.schedule);
    }

    console.log(`[INFO] Generating new schedule for user: ${userId}`);

    if (!profile.profileSummary || !profile.collegeList || profile.collegeList.reach.length === 0) {
        return res.status(400).json({ message: "Profile summary and college list must be generated before a schedule can be created." });
    }

    if (scheduleExists) {
      const oldTasks = [
        ...profile.schedule.checklist,
        ...profile.schedule.catchUp
      ].map(task => task.text);
      
      profile.completedTasks.push(...oldTasks);
    }

    const collegeListString = "Reach: " + profile.collegeList.reach.map(c => c.school).join(', ') + 
                            "\nTarget: " + profile.collegeList.target.map(c => c.school).join(', ') +
                            "\nLikely: " + profile.collegeList.likely.map(c => c.school).join(', ');

    const completedTasksString = profile.completedTasks.join('\n- ');

    const difyBody = {
      inputs: {
        "current_date": new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
        "profile": profile.profileSummary,
        "college_list": collegeListString,
        "completed_tasks": completedTasksString
      },
      response_mode: 'blocking',
      user: userId,
    };

    const aiData = await callDifyWorkflow(
      process.env.DIFY_WORKFLOW_URL,
      process.env.SCHEDULE_GENERATION_KEY,
      difyBody
    );

    const newMasterTasks = aiData.data.outputs.result.map(task => ({ ...task, status: 'incomplete' }));

    const newSchedule = {
      lastGenerated: new Date(),
      checklist: newMasterTasks,
      catchUp: [] // The catchUp list is now cleared on every regeneration cycle
    };

    profile.schedule = newSchedule;

    if(!newSchedule) {
        throw new Error("Invalid format received from schedule generation AI.");
    }
    
    newSchedule.lastGenerated = new Date();

    profile.schedule = newSchedule;
    await profile.save();

    res.json(newSchedule);
  } catch (error) {
    console.error('[ERROR] Schedule generation failed:', error);
    res.status(500).json({ message: 'Error generating schedule' });
  }
});

app.post('/api/profile/:userId/schedule/tasks', async (req, res) => {
    const { userId } = req.params;
    const { text, dueDate } = req.body;

    if (!text) {
        return res.status(400).json({ message: 'Task text is required.' });
    }

    try {
        const profile = await Profile.findOne({ userId });
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found.' });
        }

        const newTask = {
            id: new mongoose.Types.ObjectId().toString(),
            text,
            status: 'incomplete',
            dueDate: dueDate ? new Date(dueDate) : null
        };

        profile.schedule.checklist.push(newTask);
        await profile.save();
        res.status(201).json(profile.schedule);
    } catch (error) {
        res.status(500).json({ message: 'Error adding task.', error: error.message });
    }
});

app.delete('/api/profile/:userId/schedule/tasks/:taskId', async (req, res) => {
    const { userId, taskId } = req.params;

    try {
        const profile = await Profile.findOne({ userId });
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found.' });
        }

        profile.schedule.checklist = profile.schedule.checklist.filter(task => task.id !== taskId);
        profile.schedule.catchUp = profile.schedule.catchUp.filter(task => task.id !== taskId);

        await profile.save();
        res.json(profile.schedule);
    } catch (error) {
        res.status(500).json({ message: 'Error deleting task.', error: error.message });
    }
});

app.post('/api/profile/:userId/activities/improve', async (req, res) => {
  const { userId } = req.params;
  const { activityId, activityDescription } = req.body;

  if (!activityId || !activityDescription) {
    return res.status(400).json({ message: 'activityId and activityDescription are required.' });
  }

  try {
    const profile = await Profile.findOne({ userId });
    if (!profile) return res.status(404).json({ message: 'Profile not found.' });

    let activityToUpdate = null;
    let questionnaireItemIndex = -1;
    let activityIndex = -1;
    const activitiesEntry = profile.questionnaire.find((item, index) => {
      if (item.id === 'a6'){
        questionnaireItemIndex = index;
        return true;
      }
      return false;
    });

    if (activitiesEntry && Array.isArray(activitiesEntry.answer)) {
        activityToUpdate = activitiesEntry.answer.find((act, index) => {
            if (act.id === activityId) {
                activityIndexInAnswer = index;
                return true;
            }
            return false;
        });
    }

    if (!activityToUpdate){
      console.log(`[FAIL] Activity with ID ${activityId} not found in questionnaire.`);
      return res.status(404).json({ message: `Activity with ID ${activityId} not found.` });
    }

    const difyBody = {
      inputs: {
        "profile": profile.profileSummary,
        "activity_description": activityDescription
      },
      response_mode: 'blocking',
      user: userId
    };

    const aiData = await callDifyWorkflow(
      process.env.DIFY_WORKFLOW_URL,
      process.env.ACTIVITIES_IMPROVER_KEY,
      difyBody
    );

    if (!aiData || !aiData.data || !aiData.data.outputs || typeof aiData.data.outputs.improved_description !== 'string') {
        console.error("[ERROR] Invalid response structure from Dify for activity improvement:", aiData);
        throw new Error("Received invalid data from the AI improvement service.");
    }

    const improvedDescription = aiData.data.outputs.improved_description;

    // Update the description of the found activity
    profile.questionnaire[questionnaireItemIndex].answer[activityIndexInAnswer].description = improvedDescription;
    
    // Mark the nested path as modified
    profile.markModified('questionnaire');
    await profile.save();
    
    console.log(`[SUCCESS] Improved and saved activity ${activityId} for user ${userId}`);
    res.json({ improvedDescription });

  } catch (error) {
    console.error('[ERROR] Activity improvement failed:', error);
    res.status(500).json({ message: 'Error improving activity description.' });
  }
});

app.get('/api/chat/sessions/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        // Find all sessions for the user, sorted by most recently updated
        const sessions = await ChatSession.find({ userId: userId }).sort({ updatedAt: -1 });
        // Send back a summary of each session
        const sessionSummaries = sessions.map(session => ({
            id: session._id,
            title: session.messages[0]?.text || 'New Chat', // Use first message as title
            updatedAt: session.updatedAt
        }));
        res.json(sessionSummaries);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching chat sessions.' });
    }
});

app.get('/api/chat/session/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    try {
        const session = await ChatSession.findById(sessionId);
        if (!session) {
            return res.status(404).json({ message: 'Chat session not found.' });
        }
        res.json(session.messages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching session messages.' });
    }
});

app.post('/api/chat/message', async (req, res) => {
  // Use 'sessionId' consistently to match the frontend
  let { userId, message, sessionId } = req.body;
  console.log(`--- Received chat message for user: ${userId}, conversation: ${sessionId || 'new'} ---`);

  if (!userId || !message) {
    return res.status(400).json({ message: 'User ID and message are required.' });
  }

  try {
    const difyBody = {
      inputs:{},
      query: message,
      user: userId,
      // Pass the sessionId to Dify's conversation_id field
      conversation_id: sessionId || '',
      response_mode: 'blocking'
    };

    const aiData = await callDifyWorkflow(
      process.env.DIFY_CHATFLOW_URL,
      process.env.COUNSELOR_KEY,
      difyBody
    );

    const aiReplyText = aiData.answer;
    const conversationIdFromServer = aiData.conversation_id; // Get Dify's ID

    if (!aiReplyText || !conversationIdFromServer) {
        throw new Error("Invalid response from Dify chat API.");
    }

    const userMessage = { id: new mongoose.Types.ObjectId().toString(), text: message, sender: 'user' };
    const hedgeMessage = { id: new mongoose.Types.ObjectId().toString(), text: aiReplyText, sender: 'hedge' };
    
    let sessionToUpdate;
    if (sessionId) { // If the conversation already existed
      sessionToUpdate = await ChatSession.findByIdAndUpdate(
        sessionId,
        { 
            $push: { messages: { $each: [userMessage, hedgeMessage] } },
            $set: { updatedAt: new Date(), conversationId: conversationIdFromServer }
        },
        { new: true }
      );
    } else { // If it's a new conversation
      sessionToUpdate = new ChatSession({
        _id: conversationIdFromServer, // Use Dify's ID as our primary ID
        userId: userId,
        conversationId: conversationIdFromServer,
        messages: [userMessage, hedgeMessage],
      });
      await sessionToUpdate.save();
    }

    // Return the session ID to the frontend
    res.json({ reply: aiReplyText, sessionId: conversationIdFromServer });

  } catch (error) {
    console.error("Chat API Error:", error.message);
    res.status(500).json({ message: 'Error communicating with the chat service.' });
  }
});


app.get('/api/profile/:userId/reports', async (req, res) => {
    const { userId } = req.params;
    try {
        const profile = await Profile.findOne({ userId });
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found.' });
        }

        const hasCollegeList = profile.collegeList && profile.collegeList.reach.length > 0;
        const hasStrategies = profile.applicationStrategies && profile.applicationStrategies.earlyDecision;

        // Check if both reports have been generated and saved before
        if (hasCollegeList && hasStrategies) {
            console.log(`[INFO] Found saved reports for user: ${userId}`);
            res.json({
                collegeList: profile.collegeList,
                strategies: profile.applicationStrategies
            });
        } else {
            // If reports don't exist, send a 404 so the frontend knows to generate them
            console.log(`[INFO] No saved reports for user: ${userId}. Frontend should generate them.`);
            res.status(404).json({ message: 'Saved reports not found.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error fetching reports', error: error.message });
    }
});

// This route provides the prompts to the frontend
app.get('/api/essays/common-app-prompts', (req, res) => {
    res.json(COMMON_APP_PROMPTS);
});

// This route handles the AI brainstorming
app.post('/api/profile/:userId/essays/brainstorm', async (req, res) => {
    const { userId } = req.params;
    const { prompt, promptType } = req.body; // promptType will be 'commonApp', 'ucQuestions', etc.

    if (!prompt || !promptType || !prompt.id || !prompt.details) {
        return res.status(400).json({ message: 'A valid prompt object and promptType are required.' });
    }

    try {
        const profile = await Profile.findOne({ userId });
        if (!profile || !profile.profileSummary) {
            return res.status(404).json({ message: 'Profile with summary not found.' });
        }

        const difyBody = {
            inputs: {
                "profile": profile.profileSummary,
                "prompt": prompt.details
            },
            response_mode: 'blocking',
            user: userId
        };

        // Make sure to add DIFY_ESSAY_BRAINSTORM_KEY to your .env file
        const aiData = await callDifyWorkflow(
            process.env.DIFY_WORKFLOW_URL,
            process.env.ESSAY_BRAINSTORM_KEY,
            difyBody
        );
        
        // Assuming your Dify workflow returns an array of strings in an "ideas" output field
        const brainstormingIdeas = aiData.data.outputs.ideas;

        // Save the ideas to the correct place in the user's profile
        if (!profile.essaysAndActivities) {
            profile.essaysAndActivities = {};
        }

        if (promptType === 'supplementals') {
            if (!profile.essaysAndActivities.supplementals) {
                profile.essaysAndActivities.supplementals = {};
            }

            const existingEntry = profile.essaysAndActivities.supplementals[prompt.id] || {};
            profile.essaysAndActivities.supplementals[prompt.id] = {
                ...existingEntry,
                id: prompt.id,
                school: prompt.school,
                prompt: prompt.details || prompt.prompt,
                wordLimit: prompt.wordLimit || existingEntry.wordLimit || '',
                ideas: brainstormingIdeas,
            };
        } else {
            if (!profile.essaysAndActivities[promptType]) {
                profile.essaysAndActivities[promptType] = {};
            }
            profile.essaysAndActivities[promptType][prompt.id] = brainstormingIdeas;
        }
        
        profile.markModified('essaysAndActivities');
        await profile.save();

        res.json(brainstormingIdeas);
    } catch (error) {
        console.error('[ERROR] Essay brainstorming failed:', error);
        res.status(500).json({ message: 'Error generating essay ideas.' });
    }
});

app.get('/api/profile/:userId/essays/common-app', async (req, res) => {
    const { userId } = req.params;
    try {
        const profile = await Profile.findOne({ userId });

        // Check if the profile and the specific data exist
        if (profile && profile.essaysAndActivities && profile.essaysAndActivities.commonApp) {
            res.json(profile.essaysAndActivities.commonApp);
        } else {
            // If no data is found, send an empty object
            res.json({});
        }
    } catch (error) {
        res.status(500).json({ message: 'Error fetching saved Common App ideas', error: error.message });
    }
});

app.get('/api/essays/uc-prompts', (req, res) => {
    res.json(UC_PROMPTS);
});

app.get('/api/profile/:userId/essays/uc-questions', async (req, res) => {
    const { userId } = req.params;
    try {
        const profile = await Profile.findOne({ userId });
        if (profile && profile.essaysAndActivities && profile.essaysAndActivities.ucQuestions) {
            res.json(profile.essaysAndActivities.ucQuestions);
        } else {
            res.json({});
        }
    } catch (error) {
        res.status(500).json({ message: 'Error fetching saved UC ideas', error: error.message });
    }
});

app.get('/api/profile/:userId/supplementals', async (req, res) => {
    const { userId } = req.params;
    try {
        const profile = await Profile.findOne({ userId });
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found.' });
        }

        const storedSupplementals = profile.essaysAndActivities && profile.essaysAndActivities.supplementals
            ? profile.essaysAndActivities.supplementals
            : {};
        const prompts = Object.values(storedSupplementals);

        const promptCountsBySchool = prompts.reduce((acc, entry) => {
            if (!entry || !entry.school) {
                return acc;
            }
            const key = entry.school.toLowerCase();
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        let overview = [];
        if (profile.collegeList) {
            const allColleges = [
                ...(profile.collegeList.reach || []),
                ...(profile.collegeList.target || []),
                ...(profile.collegeList.likely || [])
            ];

            overview = allColleges.map(college => ({
                school: college.school,
                supplementalCount: promptCountsBySchool[college.school?.toLowerCase()] || 0,
            }));
        }

        res.json({ overview, prompts });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching supplemental essay data', error: error.message });
    }
});

app.post('/api/profile/:userId/supplementals', async (req, res) => {
    const { userId } = req.params;
    const { school, prompt, wordLimit } = req.body;

    if (!school || !prompt) {
        return res.status(400).json({ message: 'School and prompt text are required.' });
    }

    try {
        const profile = await Profile.findOne({ userId });
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found.' });
        }

        if (!profile.essaysAndActivities) {
            profile.essaysAndActivities = {};
        }
        if (!profile.essaysAndActivities.supplementals) {
            profile.essaysAndActivities.supplementals = {};
        }

        const id = new mongoose.Types.ObjectId().toString();
        const newEntry = {
            id,
            school: school.trim(),
            prompt: prompt.trim(),
            wordLimit: wordLimit ? String(wordLimit).trim() : '',
            ideas: [],
        };

        profile.essaysAndActivities.supplementals[id] = newEntry;
        profile.markModified('essaysAndActivities');
        await profile.save();

        res.status(201).json(newEntry);
    } catch (error) {
        res.status(500).json({ message: 'Error saving supplemental prompt', error: error.message });
    }
});

app.delete('/api/profile/:userId/supplementals/:promptId', async (req, res) => {
    const { userId, promptId } = req.params;

    try {
        const profile = await Profile.findOne({ userId });
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found.' });
        }

        if (!profile.essaysAndActivities || !profile.essaysAndActivities.supplementals || !profile.essaysAndActivities.supplementals[promptId]) {
            return res.status(404).json({ message: 'Supplemental prompt not found.' });
        }

        delete profile.essaysAndActivities.supplementals[promptId];
        profile.markModified('essaysAndActivities');
        await profile.save();

        res.status(204).end();
    } catch (error) {
        res.status(500).json({ message: 'Error deleting supplemental prompt', error: error.message });
    }
});

app.put('/api/profile/:userId/schedule/tasks/:taskId', async (req, res) => {
    const { userId, taskId } = req.params;
    const { status } = req.body; // e.g., 'completed' or 'incomplete'

    try {
        const profile = await Profile.findOne({ userId });
        if (!profile || !profile.schedule) {
            return res.status(404).json({ message: 'Profile or schedule not found.' });
        }

        // Find the task in either the checklist or catchUp list and update it
        let taskUpdated = false;
        ['checklist', 'catchUp'].forEach(list => {
            const task = profile.schedule[list].find(t => t.id === taskId);
            if (task) {
                task.status = status;
                taskUpdated = true;
            }
        });

        if (taskUpdated) {
            profile.markModified('schedule');
            await profile.save();
            res.json(profile.schedule);
        } else {
            res.status(404).json({ message: 'Task not found.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error updating task status.', error: error.message });
    }
});

app.post('/api/colleges/why', async (req, res) => {
    const { userId, schoolName } = req.body;
    if (!userId || !schoolName) {
        return res.status(400).json({ message: 'User ID and school name are required.' });
    }

    try {
        const profile = await Profile.findOne({ userId });
        if (!profile || !profile.collegeList) {
            return res.status(404).json({ message: 'Profile with a college list is required.' });
        }

        // 1. Check if reasons already exist in the database
        let savedReasons = null;
        let collegeToUpdate = null;
        let categoryPath = '';

        for (const category of ['reach', 'target', 'likely']) {
            collegeToUpdate = profile.collegeList[category].find(c => c.school === schoolName);
            if (collegeToUpdate) {
                categoryPath = `collegeList.${category}`;
                if (collegeToUpdate.reasons && collegeToUpdate.reasons.length > 0) {
                    savedReasons = collegeToUpdate.reasons;
                }
                break;
            }
        }

        if (savedReasons) {
            console.log(`[INFO] Returning cached 'Why' reasons for ${schoolName}`);
            return res.json(savedReasons);
        }

        // 2. If no reasons were found, generate new ones
        if (!profile.profileSummary) {
             return res.status(400).json({ message: 'A profile summary is required to generate reasons.' });
        }

        const newReasons = await generateWhyReasons(profile.profileSummary, schoolName, userId);
        
        // 3. Atomically save the newly generated reasons to the correct school in the database
        if (categoryPath && collegeToUpdate) {
            // Find the index of the college to update
            const collegeIndex = profile.collegeList[categoryPath.split('.')[1]].findIndex(c => c.school === schoolName);
            
            // Set the reasons on the specific college object
            profile.collegeList[categoryPath.split('.')[1]][collegeIndex].reasons = newReasons;
            
            profile.markModified('collegeList'); // Tell Mongoose that the nested array has changed
            await profile.save();
            console.log(`[SUCCESS] Generated and saved new 'Why' reasons for ${schoolName}`);
        }

        // 4. Return the newly generated reasons
        res.json(newReasons);

    } catch (error) {
        console.error(`[ERROR] Failed to process 'why' reasons for ${schoolName}:`, error);
        res.status(500).json({ message: 'Error processing reasons for recommendation.' });
    }
});

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
