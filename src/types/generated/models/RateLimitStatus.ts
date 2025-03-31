/* tslint:disable */
/* eslint-disable */
/**
 * Crosspost API
 * A secure proxy for social media APIs that allows authorized frontends to perform actions on behalf of users who have granted permission.
 *
 * The version of the OpenAPI document: 1.0.0
 * Contact: support@example.com
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { mapValues } from '../runtime';
/**
 * 
 * @export
 * @interface RateLimitStatus
 */
export interface RateLimitStatus {
    /**
     * Maximum number of requests allowed in the window
     * @type {number}
     * @memberof RateLimitStatus
     */
    limit: number;
    /**
     * Number of requests remaining in the current window
     * @type {number}
     * @memberof RateLimitStatus
     */
    remaining: number;
    /**
     * Timestamp when the rate limit resets (in seconds since epoch)
     * @type {number}
     * @memberof RateLimitStatus
     */
    reset: number;
    /**
     * Endpoint path
     * @type {string}
     * @memberof RateLimitStatus
     */
    endpoint: string;
}

/**
 * Check if a given object implements the RateLimitStatus interface.
 */
export function instanceOfRateLimitStatus(value: object): value is RateLimitStatus {
    if (!('limit' in value) || value['limit'] === undefined) return false;
    if (!('remaining' in value) || value['remaining'] === undefined) return false;
    if (!('reset' in value) || value['reset'] === undefined) return false;
    if (!('endpoint' in value) || value['endpoint'] === undefined) return false;
    return true;
}

export function RateLimitStatusFromJSON(json: any): RateLimitStatus {
    return RateLimitStatusFromJSONTyped(json, false);
}

export function RateLimitStatusFromJSONTyped(json: any, ignoreDiscriminator: boolean): RateLimitStatus {
    if (json == null) {
        return json;
    }
    return {
        
        'limit': json['limit'],
        'remaining': json['remaining'],
        'reset': json['reset'],
        'endpoint': json['endpoint'],
    };
}

export function RateLimitStatusToJSON(json: any): RateLimitStatus {
    return RateLimitStatusToJSONTyped(json, false);
}

export function RateLimitStatusToJSONTyped(value?: RateLimitStatus | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'limit': value['limit'],
        'remaining': value['remaining'],
        'reset': value['reset'],
        'endpoint': value['endpoint'],
    };
}

