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
import type { ResponseMetaPagination } from './ResponseMetaPagination';
import {
    ResponseMetaPaginationFromJSON,
    ResponseMetaPaginationFromJSONTyped,
    ResponseMetaPaginationToJSON,
    ResponseMetaPaginationToJSONTyped,
} from './ResponseMetaPagination';
import type { ResponseMetaRateLimit } from './ResponseMetaRateLimit';
import {
    ResponseMetaRateLimitFromJSON,
    ResponseMetaRateLimitFromJSONTyped,
    ResponseMetaRateLimitToJSON,
    ResponseMetaRateLimitToJSONTyped,
} from './ResponseMetaRateLimit';

/**
 * 
 * @export
 * @interface ResponseMeta
 */
export interface ResponseMeta {
    /**
     * 
     * @type {ResponseMetaRateLimit}
     * @memberof ResponseMeta
     */
    rateLimit?: ResponseMetaRateLimit;
    /**
     * 
     * @type {ResponseMetaPagination}
     * @memberof ResponseMeta
     */
    pagination?: ResponseMetaPagination;
}

/**
 * Check if a given object implements the ResponseMeta interface.
 */
export function instanceOfResponseMeta(value: object): value is ResponseMeta {
    return true;
}

export function ResponseMetaFromJSON(json: any): ResponseMeta {
    return ResponseMetaFromJSONTyped(json, false);
}

export function ResponseMetaFromJSONTyped(json: any, ignoreDiscriminator: boolean): ResponseMeta {
    if (json == null) {
        return json;
    }
    return {
        
        'rateLimit': json['rateLimit'] == null ? undefined : ResponseMetaRateLimitFromJSON(json['rateLimit']),
        'pagination': json['pagination'] == null ? undefined : ResponseMetaPaginationFromJSON(json['pagination']),
    };
}

export function ResponseMetaToJSON(json: any): ResponseMeta {
    return ResponseMetaToJSONTyped(json, false);
}

export function ResponseMetaToJSONTyped(value?: ResponseMeta | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'rateLimit': ResponseMetaRateLimitToJSON(value['rateLimit']),
        'pagination': ResponseMetaPaginationToJSON(value['pagination']),
    };
}

