/**
 * Utility functions for parsing CSV and XLSX files
 */

export interface ParsedFoodRecord {
    dish_name: string;
    calories_kcal: number;
    carbohydrates_g: number;
    protein_g: number;
    fats_g: number;
    free_sugar_g?: number;
    fibre_g?: number;
    sodium_mg?: number;
    calcium_mg?: number;
    iron_mg?: number;
    vitamin_c_mg?: number;
    folate_mcg?: number;
}

/**
 * Parse CSV file and return array of food records
 */
export async function parseCSVFile(file: File): Promise<ParsedFoodRecord[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const csv = e.target?.result as string;
                const lines = csv.split('\n');

                if (lines.length < 2) {
                    throw new Error('CSV file is empty or contains only headers');
                }

                const headers = lines[0].split(',').map(h => h.trim());
                const records: ParsedFoodRecord[] = [];

                // Find column indices
                const dishNameIdx = headers.findIndex(h =>
                    h.toLowerCase().includes('dish') || h.toLowerCase().includes('name')
                );
                const caloriesIdx = headers.findIndex(h =>
                    h.toLowerCase().includes('calorie')
                );
                const carbsIdx = headers.findIndex(h =>
                    h.toLowerCase().includes('carbohydrate')
                );
                const proteinIdx = headers.findIndex(h =>
                    h.toLowerCase().includes('protein')
                );
                const fatIdx = headers.findIndex(h =>
                    h.toLowerCase().includes('fat') && !h.toLowerCase().includes('carb')
                );
                const sugarIdx = headers.findIndex(h =>
                    h.toLowerCase().includes('sugar')
                );
                const fibreIdx = headers.findIndex(h =>
                    h.toLowerCase().includes('fibre') || h.toLowerCase().includes('fiber')
                );
                const sodiumIdx = headers.findIndex(h =>
                    h.toLowerCase().includes('sodium')
                );
                const calciumIdx = headers.findIndex(h =>
                    h.toLowerCase().includes('calcium')
                );
                const ironIdx = headers.findIndex(h =>
                    h.toLowerCase().includes('iron')
                );
                const vitaminCIdx = headers.findIndex(h =>
                    h.toLowerCase().includes('vitamin c') || h.toLowerCase().includes('vitaminc')
                );
                const folateIdx = headers.findIndex(h =>
                    h.toLowerCase().includes('folate')
                );

                if (dishNameIdx === -1 || caloriesIdx === -1) {
                    throw new Error('CSV must contain "Dish Name" and "Calories" columns');
                }

                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    const values = line.split(',').map(v => v.trim());

                    const record: ParsedFoodRecord = {
                        dish_name: values[dishNameIdx] || '',
                        calories_kcal: parseFloat(values[caloriesIdx]) || 0,
                        carbohydrates_g: proteinIdx >= 0 ? parseFloat(values[carbsIdx]) || 0 : 0,
                        protein_g: proteinIdx >= 0 ? parseFloat(values[proteinIdx]) || 0 : 0,
                        fats_g: fatIdx >= 0 ? parseFloat(values[fatIdx]) || 0 : 0,
                    };

                    if (sugarIdx >= 0) record.free_sugar_g = parseFloat(values[sugarIdx]) || undefined;
                    if (fibreIdx >= 0) record.fibre_g = parseFloat(values[fibreIdx]) || undefined;
                    if (sodiumIdx >= 0) record.sodium_mg = parseFloat(values[sodiumIdx]) || undefined;
                    if (calciumIdx >= 0) record.calcium_mg = parseFloat(values[calciumIdx]) || undefined;
                    if (ironIdx >= 0) record.iron_mg = parseFloat(values[ironIdx]) || undefined;
                    if (vitaminCIdx >= 0) record.vitamin_c_mg = parseFloat(values[vitaminCIdx]) || undefined;
                    if (folateIdx >= 0) record.folate_mcg = parseFloat(values[folateIdx]) || undefined;

                    if (record.dish_name) {
                        records.push(record);
                    }
                }

                resolve(records);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsText(file);
    });
}

/**
 * Parse XLSX file and return array of food records
 */
export async function parseXLSXFile(file: File): Promise<ParsedFoodRecord[]> {
    try {
        // Dynamically import XLSX
        const XLSX = (await import('xlsx')).default;

        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        if (!worksheet) {
            throw new Error('No data found in Excel file');
        }

        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
            throw new Error('Excel file is empty');
        }

        const records: ParsedFoodRecord[] = jsonData.map((row: any) => {
            // Find the correct column names
            const keys = Object.keys(row);
            const dishNameKey = keys.find(k =>
                k.toLowerCase().includes('dish') || k.toLowerCase().includes('name')
            );
            const caloriesKey = keys.find(k => k.toLowerCase().includes('calorie'));
            const carbsKey = keys.find(k => k.toLowerCase().includes('carbohydrate'));
            const proteinKey = keys.find(k => k.toLowerCase().includes('protein'));
            const fatKey = keys.find(k =>
                k.toLowerCase().includes('fat') && !k.toLowerCase().includes('carb')
            );
            const sugarKey = keys.find(k => k.toLowerCase().includes('sugar'));
            const fibreKey = keys.find(k =>
                k.toLowerCase().includes('fibre') || k.toLowerCase().includes('fiber')
            );
            const sodiumKey = keys.find(k => k.toLowerCase().includes('sodium'));
            const calciumKey = keys.find(k => k.toLowerCase().includes('calcium'));
            const ironKey = keys.find(k => k.toLowerCase().includes('iron'));
            const vitaminCKey = keys.find(k =>
                k.toLowerCase().includes('vitamin c') || k.toLowerCase().includes('vitaminc')
            );
            const folateKey = keys.find(k => k.toLowerCase().includes('folate'));

            const record: ParsedFoodRecord = {
                dish_name: dishNameKey ? String(row[dishNameKey]) : '',
                calories_kcal: caloriesKey ? parseFloat(row[caloriesKey]) || 0 : 0,
                carbohydrates_g: carbsKey ? parseFloat(row[carbsKey]) || 0 : 0,
                protein_g: proteinKey ? parseFloat(row[proteinKey]) || 0 : 0,
                fats_g: fatKey ? parseFloat(row[fatKey]) || 0 : 0,
            };

            if (sugarKey) record.free_sugar_g = parseFloat(row[sugarKey]) || undefined;
            if (fibreKey) record.fibre_g = parseFloat(row[fibreKey]) || undefined;
            if (sodiumKey) record.sodium_mg = parseFloat(row[sodiumKey]) || undefined;
            if (calciumKey) record.calcium_mg = parseFloat(row[calciumKey]) || undefined;
            if (ironKey) record.iron_mg = parseFloat(row[ironKey]) || undefined;
            if (vitaminCKey) record.vitamin_c_mg = parseFloat(row[vitaminCKey]) || undefined;
            if (folateKey) record.folate_mcg = parseFloat(row[folateKey]) || undefined;

            return record;
        });

        return records.filter(r => r.dish_name);
    } catch (error) {
        throw new Error(`Failed to parse XLSX file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Parse file based on its type (CSV or XLSX)
 */
export async function parseFile(file: File): Promise<ParsedFoodRecord[]> {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
        return parseCSVFile(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        return parseXLSXFile(file);
    } else {
        throw new Error('Unsupported file format. Please upload a CSV or XLSX file.');
    }
}

/**
 * Validate parsed food records
 */
export function validateFoodRecords(records: ParsedFoodRecord[]): {
    valid: boolean;
    errors: string[];
    records: ParsedFoodRecord[];
} {
    const errors: string[] = [];
    const validRecords: ParsedFoodRecord[] = [];

    records.forEach((record, index) => {
        const recordErrors: string[] = [];

        if (!record.dish_name || record.dish_name.trim() === '') {
            recordErrors.push('Missing dish name');
        }

        if (isNaN(record.calories_kcal) || record.calories_kcal < 0) {
            recordErrors.push('Invalid calories value');
        }

        if (isNaN(record.protein_g) || record.protein_g < 0) {
            recordErrors.push('Invalid protein value');
        }

        if (isNaN(record.carbohydrates_g) || record.carbohydrates_g < 0) {
            recordErrors.push('Invalid carbohydrates value');
        }

        if (isNaN(record.fats_g) || record.fats_g < 0) {
            recordErrors.push('Invalid fats value');
        }

        if (recordErrors.length > 0) {
            errors.push(`Row ${index + 2}: ${recordErrors.join(', ')}`);
        } else {
            validRecords.push(record);
        }
    });

    return {
        valid: errors.length === 0,
        errors,
        records: validRecords,
    };
}

/**
 * Generate sample CSV template
 */
export function generateCSVTemplate(): string {
    const headers = [
        'Dish Name',
        'Calories (kcal)',
        'Carbohydrates (g)',
        'Protein (g)',
        'Fats (g)',
        'Free Sugar (g)',
        'Fibre (g)',
        'Sodium (mg)',
        'Calcium (mg)',
        'Iron (mg)',
        'Vitamin C (mg)',
        'Folate (µg)',
    ];

    const sampleData = [
        ['Dal Makhani', '234', '12', '8', '15', '2', '3', '500', '120', '2', '10', '50'],
        ['Butter Chicken', '312', '8', '24', '22', '1', '1', '450', '80', '1', '5', '20'],
        ['Biryani', '289', '38', '12', '8', '0.5', '1', '580', '60', '2', '3', '30'],
    ];

    const csv = [headers.join(','), ...sampleData.map(row => row.join(','))].join('\n');
    return csv;
}

/**
 * Download CSV template
 */
export function downloadCSVTemplate(): void {
    const csv = generateCSVTemplate();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'food_template.csv');
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
