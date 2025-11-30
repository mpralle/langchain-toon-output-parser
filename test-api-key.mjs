#!/usr/bin/env node

/**
 * Quick test script to verify Mistral API key is working
 * Run: node test-api-key.mjs
 */

import { config } from 'dotenv';
import { ChatMistralAI } from '@langchain/mistralai';

// Load environment variables
config();

async function testApiKey() {
    console.log('🔑 Testing Mistral API Key...\n');
    
    if (!process.env.MISTRAL_API_KEY) {
        console.error('❌ MISTRAL_API_KEY not found in environment');
        console.error('   Make sure your .env file contains: MISTRAL_API_KEY=your-key-here');
        process.exit(1);
    }
    
    console.log('✅ MISTRAL_API_KEY found in environment');
    console.log(`   Key starts with: ${process.env.MISTRAL_API_KEY.substring(0, 10)}...\n`);
    
    try {
        const llm = new ChatMistralAI({
            model: 'mistral-small-latest',
            temperature: 0,
        });
        
        console.log('📞 Making test API call...');
        const response = await llm.invoke('Say "API key works!"');
        console.log('✅ API call successful!');
        console.log(`   Response: ${response.content}\n`);
        
        console.log('🎉 Your Mistral API key is working correctly!');
    } catch (error) {
        console.error('❌ API call failed:');
        console.error(`   ${error.message}\n`);
        
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            console.error('   This likely means your API key is invalid or expired.');
            console.error('   Please check your .env file and verify the key at https://console.mistral.ai');
        }
        
        process.exit(1);
    }
}

testApiKey();
