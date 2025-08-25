// backend/utils/profileUtils.js
const { callDifyWorkflow } = require('../difyService');

const ALL_QUESTIONS = {
  priorities: [
    { id: 'academics', question: 'Academics Priority' },
    { id: 'partyScene', question: 'Party Scene Priority' },
    { id: 'diversity', question: 'Diversity Priority' },
    { id: 'localArea', question: 'Local Area Priority' },
    { id: 'athletics', question: 'Athletics Priority' },
    { id: 'safety', question: 'Safety Priority' },
    { id: 'campus', question: 'Campus Priority' },
    { id: 'affordability', question: 'Affordability Priority' }
  ],
  interests: [
    { id: 'career', question: 'Do you have a career or major in mind?' },
    { id: 'subjects', question: 'What are your favorite subjects? Why?' },
    { id: 'freeTime', question: 'What do you do in your free time?' }
  ],
  aboutMe: [
    { id: 'uwGpa', question: 'Unweighted GPA' },
    { id: 'wGpa', question: 'Weighted GPA' },
    { id: 'satReading', question: 'SAT Reading Score' },
    { id: 'satMath', question: 'SAT Math Score' },
    { id: 'act', question: 'ACT Score' }
  ]
};

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
};