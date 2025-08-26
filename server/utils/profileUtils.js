// backend/utils/profileUtils.js
const { callDifyWorkflow } = require('../difyService');

const ALL_QUESTIONS = {
  priorities: [
    { id: 'p1', question: 'Academics Priority' },
    { id: 'p2', question: 'Party Scene Priority' },
    { id: 'p3', question: 'Diversity Priority' },
    { id: 'p4', question: 'Local Area Priority' },
    { id: 'p5', question: 'Athletics Priority' },
    { id: 'p6', question: 'Safety Priority' },
    { id: 'p7', question: 'Campus Priority' },
    { id: 'p8', question: 'Affordability Priority' }
  ],
  interests: [
    { id: 'i1', question: 'Do you have a career or major in mind?' },
    { id: 'i2', question: 'What are your favorite subjects? Why?' },
    { id: 'i3', question: 'What do you do in your free time?' }
  ],
  aboutMe: [
    { id: 'a1', question: 'Unweighted GPA' },
    { id: 'a2', question: 'Weighted GPA' },
    { id: 'a3', question: 'SAT Reading Score' },
    { id: 'a4', question: 'SAT Math Score' },
    { id: 'a5', question: 'ACT Score' },
    { id: 'a6', question: 'Activities' }
  ]
};

const COMMON_APP_PROMPTS = [
    { id: 'prompt1', title: 'Background Story', details: 'Some students have a background, identity, interest, or talent that is so meaningful they believe their application would be incomplete without it. If this sounds like you, then please share your story.' },
    { id: 'prompt2', title: 'Lesson from an Obstacle', details: 'The lessons we take from obstacles we encounter can be fundamental to later success. Recount a time when you faced a challenge, setback, or failure. How did it affect you, and what did you learn from the experience?' },
    { id: 'prompt3', title: 'Challenged a Belief', details: 'Reflect on a time when you questioned or challenged a belief or idea. What prompted your thinking? What was the outcome?' },
    // ... (add the other 4 official Common App prompts here)
];

const UC_PROMPTS = [
    { id: 'uc1', title: 'Leadership Experience', details: 'Describe an example of your leadership experience in which you have positively influenced others, helped resolve disputes, or contributed to group efforts over time.' },
    { id: 'uc2', title: 'Creativity', details: 'Every person has a creative side, and it can be expressed in many ways: problem solving, original and innovative thinking, and artistically, to name a few. Describe how you express your creative side.' },
    { id: 'uc3', title: 'Greatest Talent', details: 'What would you say is your greatest talent or skill? How have you developed and demonstrated that talent over time?' },
    { id: 'uc4', title: 'Educational Opportunity/Barrier', details: 'Describe how you have taken advantage of a significant educational opportunity or worked to overcome an educational barrier you have faced.' },
    { id: 'uc5', title: 'Significant Challenge', details: 'Describe the most significant challenge you have faced and the steps you have taken to overcome this challenge. How has this challenge affected your academic achievement?' },
    { id: 'uc6', title: 'Academic Subject', details: 'Think about an academic subject that inspires you. Describe how you have furthered this interest inside and/or outside of the classroom.' },
    { id: 'uc7', title: 'Community Improvement', details: 'What have you done to make your school or your community a better place?' },
    { id: 'uc8', title: 'What Makes You a Strong Candidate?', details: 'Beyond what has already been shared in your application, what do you believe makes you a strong candidate for admissions to the University of California?' },
];

/**
 * Generates an AI-powered summary of a user's profile by calling a Dify workflow.
 * @param {object} profile - The user's profile document from Mongoose.
 * @returns {Promise<string>} - An AI-generated summary string.
 */
const generateProfileSummary = async (profile) => {
  let profileString = "--- Student Profile ---\n";

  if (profile.questionnaire && profile.questionnaire.length > 0) {
    profileString += "Questionnaire Answers:\n";
    profile.questionnaire.forEach(item => {
      // Find the full question text from our corrected ALL_QUESTIONS object
      const categoryQuestions = ALL_QUESTIONS[item.category] || [];
      const questionObject = categoryQuestions.find(q => q.id === item.id);
      const questionText = questionObject ? questionObject.question : item.id; // Fallback to id if not found

      if (item.category === 'activities' && typeof item.answer === 'object' && item.answer !== null) {
        profileString += `- Activity: ${item.answer.name} - Description: ${item.answer.description}\n`;
      } else {
        profileString += `- ${questionText}: ${item.answer}\n`;
      }
    });
  }

  // (The rest of the function remains the same)
  if (profile.discovered && profile.discovered.interests && profile.discovered.interests.length > 0) {
    profileString += "Discovered Interests: " + profile.discovered.interests.join(', ') + "\n";
  }
  if (profile.discovered && profile.discovered.strengths && profile.discovered.strengths.length > 0) {
    profileString += "Discovered Strengths: " + profile.discovered.strengths.join(', ') + "\n";
  }

  profileString = profileString.trim();
  console.log("---- Sending this string to Dify for summarization ----\n", profileString);

  try {
    const difyBody = {
      inputs: {
        "profile": profileString
      },
      response_mode: 'blocking',
      user: profile.userId
    };

    const aiData = await callDifyWorkflow(
      process.env.DIFY_WORKFLOW_URL,
      process.env.PROFILE_SUMMARY_KEY,
      difyBody
    );

    const summary = aiData.data.outputs.summary; 
    console.log(`[SUCCESS] Dify generated profile summary for user: ${profile.userId}`);
    return summary;

  } catch (error) {
    console.error("Failed to generate profile summary from Dify:", error);
    return profileString; 
  }
};

module.exports = {
    generateProfileSummary,
    ALL_QUESTIONS,
    COMMON_APP_PROMPTS,
    UC_PROMPTS
};