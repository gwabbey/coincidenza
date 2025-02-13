"use server";

import axios from 'axios';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import path from 'path';

const PRIVATE_KEY_PATH = path.resolve(process.cwd(), process.env.APPLE_MAPS_PRIVATE_KEY!);
const TEAM_ID = process.env.APPLE_MAPS_TEAM_ID;
const KEY_ID = process.env.APPLE_MAPS_KEY_ID;

interface Token {
    accessToken: string;
    expiresInSeconds: number;
}

/**
 * Generates a JWT for Apple Maps API authentication.
 * @returns {string} A signed JWT token.
 */
function generateAppleMapsToken(): string {
    const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');


    // JWT Header
    const header = {
        alg: 'ES256', // Algorithm
        kid: KEY_ID, // Replace with your Key ID
    };

    // JWT Payload
    const payload = {
        iss: TEAM_ID, // Replace with your Team ID
        iat: Math.floor(Date.now() / 1000), // Issued at (current time in seconds)
        exp: Math.floor(Date.now() / 1000) + 3600, // Expiration time (1 hour from now)
    };

    const token = jwt.sign(payload, privateKey, {
        algorithm: 'ES256',
        header: header,
    });

    return token;
}

/**
 * Fetches a Maps token from the Apple Maps API.
 * @returns {Promise<TokenResponse>} The maps token and expiration.
 */
async function fetchAppleMapsToken(): Promise<Token> {
    const jwtToken = generateAppleMapsToken();

    try {
        const response = await axios.get<Token>(
            'https://maps-api.apple.com/v1/token',
            {
                headers: {
                    'Authorization': `Bearer ${jwtToken}`,
                },
                timeout: 5000,
                validateStatus: status => status === 200
            }
        );

        if (!response.data?.accessToken || !response.data?.expiresInSeconds) {
            throw new Error('Invalid token response format');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const message = error.response?.data?.error || error.message;

            // Log detailed error for debugging
            console.error('Apple Maps API Error:', {
                status,
                message,
                requestId: error.response?.headers['x-request-id']
            });

            throw new Error(`Apple Maps API error (${status}): ${message}`);
        }
        throw error;
    }
}

let cachedToken: Token | null = null;

/**
 * Gets a valid Apple Maps token, using cache if available.
 * @returns {Promise<string>} A valid Maps token.
 */
export async function getCachedMapsToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const BUFFER_TIME = 600; // 10 minute buffer

    // Check if we have a valid cached token
    if (cachedToken?.accessToken && now < (cachedToken.expiresInSeconds - BUFFER_TIME)) {
        console.log(`Cached token valid for ${cachedToken.expiresInSeconds - now} more seconds`);
        return cachedToken.accessToken;
    }

    try {
        const { accessToken, expiresInSeconds } = await fetchAppleMapsToken();

        cachedToken = {
            accessToken,
            expiresInSeconds: now + expiresInSeconds // Store absolute expiration time
        };

        return accessToken;
    } catch (error) {
        // Fallback to cached token if it hasn't fully expired yet
        if (cachedToken?.accessToken && now < cachedToken.expiresInSeconds) {
            console.warn('Failed to fetch new token, falling back to cached token');
            return cachedToken.accessToken;
        }
        throw error;
    }
}