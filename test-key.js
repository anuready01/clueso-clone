// test-key.js
require('dotenv').config();
const { OpenAI } = require('openai');

async function testKey() {
  console.log('🔐 Testing your OpenAI API key...');
  console.log('Key starts with:', process.env.OPENAI_API_KEY?.substring(0, 20) + '...');
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  try {
    // Test with traditional Chat Completions API (not Responses API)
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",  // Use this model, not gpt-5-nano
      messages: [
        { role: "user", content: "Say 'API key is working!' in 5 words max" }
      ],
      max_tokens: 10
    });

    console.log('✅ SUCCESS! OpenAI API is working!');
    console.log('Response:', completion.choices[0].message.content);
    console.log('Model used:', completion.model);
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    
    if (error.message.includes('Incorrect API key')) {
      console.log('\n💡 TIPS:');
      console.log('1. Make sure .env file is in backend/ folder');
      console.log('2. Key should start with "sk-proj-"');
      console.log('3. Restart server after updating .env');
      console.log('4. Check billing at: https://platform.openai.com/account/billing');
    }
    
    if (error.message.includes('gpt-5')) {
      console.log('\n⚠️  NOTE: Your dashboard shows GPT-5, but use gpt-3.5-turbo');
      console.log('GPT-5 is new API format, but gpt-3.5-turbo works with your key');
    }
  }
}

testKey();