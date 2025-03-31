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
 * @interface MediaMetadataUpdateRequest
 */
export interface MediaMetadataUpdateRequest {
    /**
     * Alternative text for accessibility
     * @type {string}
     * @memberof MediaMetadataUpdateRequest
     */
    altText: string;
}

/**
 * Check if a given object implements the MediaMetadataUpdateRequest interface.
 */
export function instanceOfMediaMetadataUpdateRequest(value: object): value is MediaMetadataUpdateRequest {
    if (!('altText' in value) || value['altText'] === undefined) return false;
    return true;
}

export function MediaMetadataUpdateRequestFromJSON(json: any): MediaMetadataUpdateRequest {
    return MediaMetadataUpdateRequestFromJSONTyped(json, false);
}

export function MediaMetadataUpdateRequestFromJSONTyped(json: any, ignoreDiscriminator: boolean): MediaMetadataUpdateRequest {
    if (json == null) {
        return json;
    }
    return {
        
        'altText': json['altText'],
    };
}

export function MediaMetadataUpdateRequestToJSON(json: any): MediaMetadataUpdateRequest {
    return MediaMetadataUpdateRequestToJSONTyped(json, false);
}

export function MediaMetadataUpdateRequestToJSONTyped(value?: MediaMetadataUpdateRequest | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'altText': value['altText'],
    };
}

