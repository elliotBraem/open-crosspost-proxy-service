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


import * as runtime from '../runtime';
import type {
  ErrorResponse,
  MediaMetadataUpdateRequest,
  MediaMetadataUpdateResponse,
  MediaStatusResponse,
  MediaUploadFormRequest,
  MediaUploadJsonRequest,
  MediaUploadResponse,
} from '../models/index';
import {
    ErrorResponseFromJSON,
    ErrorResponseToJSON,
    MediaMetadataUpdateRequestFromJSON,
    MediaMetadataUpdateRequestToJSON,
    MediaMetadataUpdateResponseFromJSON,
    MediaMetadataUpdateResponseToJSON,
    MediaStatusResponseFromJSON,
    MediaStatusResponseToJSON,
    MediaUploadFormRequestFromJSON,
    MediaUploadFormRequestToJSON,
    MediaUploadJsonRequestFromJSON,
    MediaUploadJsonRequestToJSON,
    MediaUploadResponseFromJSON,
    MediaUploadResponseToJSON,
} from '../models/index';

export interface GetMediaStatusRequest {
    id: string;
}

export interface UpdateMediaMetadataRequest {
    id: string;
    mediaMetadataUpdateRequest: MediaMetadataUpdateRequest;
}

export interface UploadMediaRequest {
    mediaUploadJsonRequest: MediaUploadJsonRequest;
}

/**
 * 
 */
export class MediaApi extends runtime.BaseAPI {

    /**
     * Get the status of a media upload
     * Get media status
     */
    async getMediaStatusRaw(requestParameters: GetMediaStatusRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<MediaStatusResponse>> {
        if (requestParameters['id'] == null) {
            throw new runtime.RequiredError(
                'id',
                'Required parameter "id" was null or undefined when calling getMediaStatus().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        if (this.configuration && this.configuration.apiKey) {
            headerParameters["Authorization"] = await this.configuration.apiKey("Authorization"); // nearSignature authentication
        }

        const response = await this.request({
            path: `/api/media/{id}/status`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters['id']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => MediaStatusResponseFromJSON(jsonValue));
    }

    /**
     * Get the status of a media upload
     * Get media status
     */
    async getMediaStatus(requestParameters: GetMediaStatusRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<MediaStatusResponse> {
        const response = await this.getMediaStatusRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Update metadata for a media upload (e.g., alt text)
     * Update media metadata
     */
    async updateMediaMetadataRaw(requestParameters: UpdateMediaMetadataRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<MediaMetadataUpdateResponse>> {
        if (requestParameters['id'] == null) {
            throw new runtime.RequiredError(
                'id',
                'Required parameter "id" was null or undefined when calling updateMediaMetadata().'
            );
        }

        if (requestParameters['mediaMetadataUpdateRequest'] == null) {
            throw new runtime.RequiredError(
                'mediaMetadataUpdateRequest',
                'Required parameter "mediaMetadataUpdateRequest" was null or undefined when calling updateMediaMetadata().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        if (this.configuration && this.configuration.apiKey) {
            headerParameters["Authorization"] = await this.configuration.apiKey("Authorization"); // nearSignature authentication
        }

        const response = await this.request({
            path: `/api/media/{id}/metadata`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters['id']))),
            method: 'PUT',
            headers: headerParameters,
            query: queryParameters,
            body: MediaMetadataUpdateRequestToJSON(requestParameters['mediaMetadataUpdateRequest']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => MediaMetadataUpdateResponseFromJSON(jsonValue));
    }

    /**
     * Update metadata for a media upload (e.g., alt text)
     * Update media metadata
     */
    async updateMediaMetadata(requestParameters: UpdateMediaMetadataRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<MediaMetadataUpdateResponse> {
        const response = await this.updateMediaMetadataRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Upload media for use in posts
     * Upload media
     */
    async uploadMediaRaw(requestParameters: UploadMediaRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<MediaUploadResponse>> {
        if (requestParameters['mediaUploadJsonRequest'] == null) {
            throw new runtime.RequiredError(
                'mediaUploadJsonRequest',
                'Required parameter "mediaUploadJsonRequest" was null or undefined when calling uploadMedia().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        if (this.configuration && this.configuration.apiKey) {
            headerParameters["Authorization"] = await this.configuration.apiKey("Authorization"); // nearSignature authentication
        }

        const response = await this.request({
            path: `/api/media`,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: MediaUploadJsonRequestToJSON(requestParameters['mediaUploadJsonRequest']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => MediaUploadResponseFromJSON(jsonValue));
    }

    /**
     * Upload media for use in posts
     * Upload media
     */
    async uploadMedia(requestParameters: UploadMediaRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<MediaUploadResponse> {
        const response = await this.uploadMediaRaw(requestParameters, initOverrides);
        return await response.value();
    }

}
