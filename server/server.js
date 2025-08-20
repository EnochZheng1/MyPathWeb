// backend/server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { callDifyWorkflow } = require('./difyService');
const { generateProfileSummary, ALL_QUESTIONS } = require('./utils/profileUtils');
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
      targetDate: { type: String, default: '' }
    },
    gpa: {
      current: { type: Number, default: null },
      goal: { type: Number, default: null }
    },
    competitions: [{
        id: { type: String },
        name: { type: String },
        result: { type: String }
    }],
  },
  schedule: {
    lastGenerated: { type: Date },
    // Both checklist and catchUp will store an array of task objects
    checklist: [{
      id: { type: String, required: true },
      text: { type: String, required: true },
      status: { type: String, default: 'incomplete' } // 'incomplete' or 'complete'
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

    console.log(`[SUCCESS] User signed in: ${profile.userId}`);
    res.status(200).json({
      message: 'Sign in successful!',
      userId: profile.userId,
    });
  } catch (error) {
    console.error('[ERROR] Server error during sign in:', error);
    res.status(500).json({ message: 'Server error during sign in.', error });
  }
});

// GET a user's profile
app.get('/api/profile/:userId', async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.params.userId });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found." });
    }
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error });
  }
});

// UPDATE a user's profile
app.put('/api/profile/:userId', async (req, res) => {
  const { userId } = req.params;
  const { questionnaire } = req.body;

  console.log(`--- Received request to PUT /api/profile/${userId} ---`);
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  if (!questionnaire) {
    return res.status(400).json({ message: "Missing 'questionnaire' data in request body." });
  }

  try {
    const profile = await Profile.findOne({ userId: userId });
    if (!profile) {
      console.log(`[FAIL] Profile not found for userId: ${userId}`);
      return res.status(404).json({ message: "Profile not found." });
    }

    // --- Data Transformation Logic ---
    // This transforms the processed data into the flat array structure of our schema
    const formattedAnswers = [];
    for (const category in questionnaire) {
      // Loop through priorities, interests, aboutMe
      for (const questionId in questionnaire[category]) {
        const answerText = questionnaire[category][questionId];
        formattedAnswers.push({
          id: questionId,
          category: category,
          question: questionId, // For simplicity; could be mapped to full question text
          answer: answerText,
        });
      }
    }
    // --- Database Update ---
    profile.questionnaire = formattedAnswers;
    profile.lastUpdated = Date.now();
    
    // You could optionally re-generate the profile summary here as well
    // profile.profileSummary = await generateProfileSummary(profile);
    
    await profile.save();

    console.log(`[SUCCESS] Profile updated for userId: ${userId}`);
    res.json({ message: 'Profile updated successfully!', profile });

  } catch (error) {
    console.error(`[ERROR] Error updating profile for ${userId}:`, error);
    res.status(500).json({ message: 'Error updating profile', error });
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
      aboutMe: {}
    };

    profile.questionnaire.forEach(item => {
      if (answersForUI[item.category]) {
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
    if (profile.schedule && profile.schedule.lastGenerated && profile.schedule.lastGenerated > twoWeeksAgo){
      console.log(`[INFO] Returning saved schedule for user: ${userId}`);
      return res.json(profile.schedule);
    }

    console.log(`[INFO] Generating new schedule for user: ${userId}`);

    if (!profile.profileSummary || !profile.collegeList || profile.collegeList.reach.length === 0) {
        return res.status(400).json({ message: "Profile summary and college list must be generated before a schedule can be created." });
    }

    let completedTaskString = "None";
    if (profile.schedule && (profile.schedule.checklist.length > 0 || profile.schedule.catchUp.length > 0)){
      const completed = [
        ...profile.schedule.checklist,
        ...profile.schedule.catchUp
      ].filter(task => task.status === 'complete').map(task => `- ${task.text}`).join('\n');

      if (completed) {
        completedTaskString = completed;
      }
    }

    const collegeListString = "Reach: " + profile.collegeList.reach.map(c => c.school).join(', ') + 
                            "\nTarget: " + profile.collegeList.target.map(c => c.school).join(', ') +
                            "\nLikely: " + profile.collegeList.likely.map(c => c.school).join(', ');

    const difyBody = {
      inputs: {
        "current_date": new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
        "profile": profile.profileSummary,
        "college_list": collegeListString,
        "completed_tasks": completedTaskString
      },
      response_mode: 'blocking',
      user: userId,
    };

    const aiData = await callDifyWorkflow(
      process.env.DIFY_WORKFLOW_URL,
      process.env.SCHEDULE_GENERATION_KEY,
      difyBody
    );

    const newSchedule = aiData.data.outputs.result; 

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

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});