import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

// Cache for access tokens
interface TokenCache {
    token: string
    expiresAt: number
}

let tokenCache: TokenCache | null = null

async function getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (tokenCache && Date.now() < tokenCache.expiresAt) {
        console.log('Using cached FatSecret token')
        return tokenCache.token
    }

    const clientId = Deno.env.get('FATSECRET_CLIENT_ID')
    const clientSecret = Deno.env.get('FATSECRET_CLIENT_SECRET')

    console.log('Getting new FatSecret token...', { clientId: clientId ? 'set' : 'missing', clientSecret: clientSecret ? 'set' : 'missing' })

    if (!clientId || !clientSecret) {
        throw new Error('Missing FATSECRET_CLIENT_ID or FATSECRET_CLIENT_SECRET environment variables')
    }

    const response = await fetch('https://oauth.fatsecret.com/connect/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
            scope: 'basic',
        }).toString(),
    })

    if (!response.ok) {
        const errorText = await response.text()
        console.error('OAuth error:', { status: response.status, statusText: response.statusText, body: errorText })
        throw new Error(`OAuth failed: ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()

    // Cache the token
    tokenCache = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in * 1000),
    }

    console.log('FatSecret token obtained successfully')
    return data.access_token
}

async function searchFoods(query: string, maxResults: number = 15): Promise<any> {
    const token = await getAccessToken()

    const searchUrl = `https://platform.fatsecret.com/rest/foods/search/v1?search_expression=${encodeURIComponent(query)}&max_results=${maxResults}&format=json`

    console.log('Searching FatSecret:', { query, maxResults, url: searchUrl })

    const response = await fetch(
        searchUrl,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        }
    )

    if (!response.ok) {
        const errorText = await response.text()
        console.error('FatSecret search error:', { status: response.status, statusText: response.statusText, body: errorText })
        throw new Error(`Search failed: ${response.statusText} - ${errorText}`)
    }

    return response.json()
}

async function getFoodNutrition(foodId: string): Promise<any> {
    const token = await getAccessToken()

    const response = await fetch(
        `https://platform.fatsecret.com/rest/food/v5?food_id=${foodId}&format=json`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    )

    if (!response.ok) {
        throw new Error(`Failed to get nutrition: ${response.statusText}`)
    }

    return response.json()
}

serve(async (req) => {
    // Handle CORS preflight - MUST return 200 status
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        })
    }

    try {
        const { action, query, foodId, maxResults } = await req.json()

        let result

        if (action === 'search') {
            result = await searchFoods(query, maxResults || 15)
        } else if (action === 'getNutrition') {
            result = await getFoodNutrition(foodId)
        } else {
            throw new Error('Invalid action')
        }

        return new Response(
            JSON.stringify(result),
            {
                status: 200,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                },
            }
        )
    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error',
            }),
            {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                },
            }
        )
    }
})
