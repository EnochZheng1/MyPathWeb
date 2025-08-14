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

const ProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  lastUpdated: { type: Date, default: Date.now },
  questionnaire: { type: Array, default: [] },
  discovered: { type: Object, default: { interests: [], strengths: [], goals: [] } },
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

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});