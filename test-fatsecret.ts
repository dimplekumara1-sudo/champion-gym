// Test script for FatSecret API proxy
// Run with: npx ts-node test-fatsecret.ts

import fetch from 'node-fetch';

const PROXY_URL = 'https://vlvecmxfsbvwrcnminmz.supabase.co/functions/v1/fatsecret-proxy';

async function testSearch() {
    try {
        console.log('🔍 Testing food search...');
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'search',
                query: 'banana',
                maxResults: 5,
            }),
        });

        if (!response.ok) {
            console.error(`❌ Error: ${response.statusText}`);
            console.error(await response.text());
            return;
        }

        const data = await response.json();
        console.log('✅ Search results:');
        console.log(JSON.stringify(data, null, 2));

        // Test getting nutrition for first result
        if (data.foods?.food?.length > 0) {
            const foodId = data.foods.food[0].food_id;
            console.log(`\n📊 Testing nutrition fetch for food ID: ${foodId}`);

            const nutritionResponse = await fetch(PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'getNutrition',
                    foodId: foodId,
                }),
            });

            if (!nutritionResponse.ok) {
                console.error(`❌ Error: ${nutritionResponse.statusText}`);
                console.error(await nutritionResponse.text());
                return;
            }

            const nutrition = await nutritionResponse.json();
            console.log('✅ Nutrition data:');
            console.log(JSON.stringify(nutrition, null, 2));
        }
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testSearch();
