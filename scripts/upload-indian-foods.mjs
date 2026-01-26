import * as fs from 'fs';
import * as path from 'path';

async function uploadIndianFoods() {
    try {
        // Dynamic imports
        const { createClient } = await import('@supabase/supabase-js');
        const csv = await import('csv-parse/sync');

        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing Supabase credentials. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
            process.exit(1);
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        console.log('Starting upload of Indian food nutrition data...');

        const csvPath = path.join(
            process.env.HOME || process.env.USERPROFILE || '.',
            'Downloads',
            'indian-food-nutrition',
            'Indian_Food_Nutrition_Processed.csv'
        );

        console.log(`Reading CSV from: ${csvPath}`);

        if (!fs.existsSync(csvPath)) {
            console.error(`CSV file not found at ${csvPath}`);
            process.exit(1);
        }

        const fileContent = fs.readFileSync(csvPath, 'utf-8');
        const records = csv.parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
        });

        console.log(`Parsed ${records.length} food records from CSV`);

        // Transform records to match database schema
        const transformedRecords = records.map((record) => ({
            dish_name: record['Dish Name'].trim(),
            calories_kcal: parseFloat(record['Calories (kcal)']) || 0,
            carbohydrates_g: parseFloat(record['Carbohydrates (g)']) || 0,
            protein_g: parseFloat(record['Protein (g)']) || 0,
            fats_g: parseFloat(record['Fats (g)']) || 0,
            free_sugar_g: parseFloat(record['Free Sugar (g)']) || null,
            fibre_g: parseFloat(record['Fibre (g)']) || null,
            sodium_mg: parseFloat(record['Sodium (mg)']) || null,
            calcium_mg: parseFloat(record['Calcium (mg)']) || null,
            iron_mg: parseFloat(record['Iron (mg)']) || null,
            vitamin_c_mg: parseFloat(record['Vitamin C (mg)']) || null,
            folate_mcg: parseFloat(record['Folate (µg)']) || null,
        }));

        console.log('Uploading records to Supabase...');

        // Upload in batches of 50 to avoid size limits
        const batchSize = 50;
        let uploadedCount = 0;

        for (let i = 0; i < transformedRecords.length; i += batchSize) {
            const batch = transformedRecords.slice(i, i + batchSize);

            try {
                const { data, error } = await supabase
                    .from('indian_foods')
                    .upsert(batch, { onConflict: 'dish_name' });

                if (error) {
                    console.error(`Error uploading batch ${Math.floor(i / batchSize) + 1}:`, error);
                    throw error;
                }

                uploadedCount += batch.length;
                console.log(`✓ Uploaded ${uploadedCount} of ${transformedRecords.length} records`);
            } catch (error) {
                console.error(`Failed to upload batch starting at index ${i}:`, error);
                throw error;
            }
        }

        console.log('✓ Successfully uploaded all Indian food nutrition data to Supabase!');
        console.log(`Total records: ${uploadedCount}, Table: indian_foods`);
        process.exit(0);
    } catch (error) {
        console.error('Upload failed:', error);
        process.exit(1);
    }
}

uploadIndianFoods();
