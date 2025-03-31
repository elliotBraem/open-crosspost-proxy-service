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
 * @interface MediaUploadJsonRequest
 */
export interface MediaUploadJsonRequest {
    /**
     * Base64 encoded media data
     * @type {string}
     * @memberof MediaUploadJsonRequest
     */
    data: string;
    /**
     * Media MIME type
     * @type {string}
     * @memberof MediaUploadJsonRequest
     */
    mimeType: string;
    /**
     * Alternative text for accessibility
     * @type {string}
     * @memberof MediaUploadJsonRequest
     */
    altText?: string;
}

/**
 * Check if a given object implements the MediaUploadJsonRequest interface.
 */
export function instanceOfMediaUploadJsonRequest(value: object): value is MediaUploadJsonRequest {
    if (!('data' in value) || value['data'] === undefined) return false;
    if (!('mimeType' in value) || value['mimeType'] === undefined) return false;
    return true;
}

export function MediaUploadJsonRequestFromJSON(json: any): MediaUploadJsonRequest {
    return MediaUploadJsonRequestFromJSONTyped(json, false);
}

export function MediaUploadJsonRequestFromJSONTyped(json: any, ignoreDiscriminator: boolean): MediaUploadJsonRequest {
    if (json == null) {
        return json;
    }
    return {
        
        'data': json['data'],
        'mimeType': json['mimeType'],
        'altText': json['altText'] == null ? undefined : json['altText'],
    };
}

export function MediaUploadJsonRequestToJSON(json: any): MediaUploadJsonRequest {
    return MediaUploadJsonRequestToJSONTyped(json, false);
}

export function MediaUploadJsonRequestToJSONTyped(value?: MediaUploadJsonRequest | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'data': value['data'],
        'mimeType': value['mimeType'],
        'altText': value['altText'],
    };
}

