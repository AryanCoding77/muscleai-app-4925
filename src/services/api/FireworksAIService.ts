// Fireworks AI Service - Core API Integration

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  AIServiceConfig,
  AIChatRequest,
  MuscleAnalysisResponse,
  APIResponse,
  APIError,
  APIErrorCode,
  APIState,
} from '../../types/api.types';
import { API_CONFIG, ERROR_MESSAGES, ANALYSIS_PROMPT } from '../../config/constants';
import { ImageProcessor } from '../image/ImageProcessor';
import { CacheManager } from '../cache/CacheManager';
import { QueueManager } from '../queue/QueueManager';

export class FireworksAIService {
  private static instance: FireworksAIService;
  private axiosInstance: AxiosInstance;
  private config: AIServiceConfig;
  private cacheManager: CacheManager;
  private queueManager: QueueManager;
  private abortController: AbortController | null = null;

  private constructor() {
    this.config = this.loadConfig();
    this.axiosInstance = this.createAxiosInstance();
    this.cacheManager = CacheManager.getInstance();
    this.queueManager = QueueManager.getInstance();
  }

  public static getInstance(): FireworksAIService {
    if (!FireworksAIService.instance) {
      FireworksAIService.instance = new FireworksAIService();
    }
    return FireworksAIService.instance;
  }

  private loadConfig(): AIServiceConfig {
    return {
      apiKey: process.env.EXPO_PUBLIC_FIREWORKS_API_KEY || '',
      apiUrl: process.env.EXPO_PUBLIC_FIREWORKS_API_URL || 'https://api.fireworks.ai/inference/v1/chat/completions',
      timeout: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '60000'),
      maxRetries: parseInt(process.env.EXPO_PUBLIC_MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.EXPO_PUBLIC_RETRY_DELAY || '1000'),
    };
  }

  private createAxiosInstance(): AxiosInstance {
    return axios.create({
      baseURL: this.config.apiUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }


  public async analyzeMuscleImage(
    imageUri: string,
    onProgress?: (state: APIState) => void
  ): Promise<APIResponse<MuscleAnalysisResponse>> {
    const startTime = Date.now();
    let retryCount = 0;

    console.log('🚀 === MUSCLE AI ANALYSIS (FIREWORKS) STARTED ===');
    console.log('📸 Image URI:', imageUri);
    console.log('🔑 API Key Present:', !!this.config.apiKey);
    console.log('🌐 API URL:', this.config.apiUrl);
    console.log('⏱️ Timeout:', this.config.timeout);
    console.log('🔄 Max Retries:', this.config.maxRetries);
    console.log('==============================================');

    try {
      // Validate API key first
      if (!this.config.apiKey || this.config.apiKey.trim() === '') {
        console.error('❌ API KEY ERROR: No API key provided');
        const apiError: APIError = {
          code: APIErrorCode.AUTH_ERROR,
          message: 'Missing API key',
          retryable: false,
          userMessage: 'Missing API key. Please check your environment configuration.',
        };
        return {
          success: false,
          error: apiError,
          timestamp: Date.now(),
        };
      }

      // Check cache first
      console.log('🔍 Checking cache for existing analysis...');
      const cachedResult = await this.cacheManager.getCachedAnalysis(imageUri);
      if (cachedResult) {
        console.log('✅ Found cached result, returning immediately');
        return {
          success: true,
          data: cachedResult,
          timestamp: Date.now(),
          cached: true,
        };
      }
      console.log('❌ No cached result found, proceeding with API call');

      // Update progress
      onProgress?.({
        isLoading: true,
        progress: 10,
        statusMessage: 'Preparing image for analysis...',
        error: null,
        retryCount: 0,
      });

      // Process image
      console.log('🖼️ Processing image...');
      const processedImage = await ImageProcessor.processImage(imageUri);
      console.log('✅ Image processed successfully');
      console.log('📏 Image size:', processedImage.base64.length, 'characters');

      onProgress?.({
        isLoading: true,
        progress: 30,
        statusMessage: 'Sending to AI for analysis...',
        error: null,
        retryCount: 0,
      });

      // Prepare request
      console.log('📝 Preparing API request...');
      const request = this.prepareRequest(processedImage.base64);
      console.log('✅ Request prepared with model:', API_CONFIG.FIREWORKS_MODEL);
      console.log('📊 Request tokens limit:', request.max_tokens);

      // Execute with retry logic
      console.log('🌐 Sending request to Fireworks AI...');
      const response = await this.executeWithRetry(
        request,
        retryCount,
        onProgress
      );
      console.log('✅ Received response from API');

      // Parse and validate response
      console.log('🔄 Parsing API response...');
      const analysisResult = this.parseResponse(response);
      console.log('✅ Response parsed successfully');

      // Cache successful result
      console.log('💾 Caching analysis result...');
      await this.cacheManager.cacheAnalysis(imageUri, analysisResult);
      console.log('✅ Result cached successfully');

      console.log('🎉 === ANALYSIS COMPLETED SUCCESSFULLY ===');
      return {
        success: true,
        data: analysisResult,
        timestamp: Date.now(),
        cached: false,
      };
    } catch (error) {
      console.error('💥 === ANALYSIS FAILED ===');
      console.error('❌ Error details:', error);
      console.error('🔍 Error type:', typeof error);
      console.error('📝 Error message:', (error as any)?.message || 'Unknown error');
      console.error('🏗️ Error stack:', (error as any)?.stack || 'No stack trace');
      console.error('==========================');

      const apiError = this.handleError(error);
      return {
        success: false,
        error: apiError,
        timestamp: Date.now(),
      };
    } finally {
      const duration = Date.now() - startTime;
      console.log(`⏱️ Total analysis duration: ${duration}ms`);
      console.log('🏁 === ANALYSIS PROCESS ENDED ===');
    }
  }

  private prepareRequest(base64Image: string): AIChatRequest {
    return {
      model: API_CONFIG.FIREWORKS_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: ANALYSIS_PROMPT },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64Image}` },
            },
          ],
        },
      ],
      max_tokens: API_CONFIG.MAX_TOKENS,
      temperature: API_CONFIG.TEMPERATURE,
      top_p: API_CONFIG.TOP_P,
    };
  }

  private async executeWithRetry(
    request: AIChatRequest,
    retryCount: number,
    onProgress?: (state: APIState) => void
  ): Promise<any> {
    const maxRetries = this.config.maxRetries;

    console.log('🔄 Starting API request with retry logic...');
    console.log('🎯 Max retries allowed:', maxRetries);

    while (retryCount <= maxRetries) {
      try {
        console.log(`📡 Attempt ${retryCount + 1}/${maxRetries + 1}`);

        // Create new abort controller for this request
        this.abortController = new AbortController();
        console.log('🛡️ Abort controller created');

        // Log request details (without sensitive data)
        console.log('📤 Sending POST request to:', this.config.apiUrl);
        console.log('🔐 Authorization header present:', !!this.config.apiKey);
        console.log('⏱️ Request timeout:', this.config.timeout);
        console.log('📦 Request payload size:', JSON.stringify(request).length, 'bytes');

        const response = await this.axiosInstance.post('', request, {
          signal: this.abortController?.signal,
          timeout: this.config.timeout,
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          onUploadProgress: (progressEvent: any) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total!);
            console.log(`📤 Upload progress: ${progress}%`);
            onProgress?.({ isLoading: true, progress, statusMessage: 'Uploading...', error: null, retryCount: 0 });
          },
        });

        console.log('✅ API request successful!');
        console.log('📊 Response status:', response.status);
        console.log('📏 Response data size:', JSON.stringify(response.data).length, 'bytes');
        console.log('🔍 Response structure:', Object.keys(response.data || {}));

        return response.data;
      } catch (error) {
        console.error(`❌ Request attempt ${retryCount + 1} failed`);

        if (axios.isCancel(error)) {
          console.error('🚫 Request was cancelled by user');
          throw new Error('Request cancelled by user');
        }

        if (axios.isAxiosError(error)) {
          console.error('🌐 Axios Error Details:');
          console.error('   Status:', error.response?.status);
          console.error('   Status Text:', error.response?.statusText);
          console.error('   Headers:', error.response?.headers);
          console.error('   Data:', error.response?.data);
          console.error('   Request URL:', error.config?.url);
          console.error('   Request Method:', error.config?.method);
        } else {
          console.error('🔥 Non-Axios Error:', error);
        }

        const isRetryable = this.isRetryableError(error as AxiosError);
        console.log('🔄 Is error retryable?', isRetryable);

        if (!isRetryable || retryCount >= maxRetries) {
          console.error('🛑 Max retries reached or error not retryable, giving up');
          throw error;
        }

        retryCount++;
        const delay = this.calculateRetryDelay(retryCount);
        console.log(`⏳ Waiting ${delay}ms before retry ${retryCount}...`);

        onProgress?.({
          isLoading: true,
          progress: 30 + retryCount * 10,
          statusMessage: `Retrying analysis (attempt ${retryCount + 1}/${maxRetries + 1})...`,
          error: null,
          retryCount,
        });

        await this.delay(delay);
      }
    }

    console.error('💥 All retry attempts exhausted');
    throw new Error('Max retries exceeded');
  }

  private isRetryableError(error: AxiosError): boolean {
    if (!error.response) {
      return true; // Network errors are retryable
    }

    const status = error.response.status;
    return status === 429 || status === 503 || status >= 500;
  }

  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = this.config.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(API_CONFIG.EXPONENTIAL_BACKOFF_FACTOR, retryCount - 1);
    const jitter = Math.random() * 1000; // Add random jitter
    return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private parseResponse(response: any): MuscleAnalysisResponse {
    try {
      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        throw { message: 'No content in response', code: 'INVALID_RESPONSE' };
      }

      // Log API response to terminal for debugging
      console.log('=== FIREWORKS API RESPONSE ===');
      console.log('Raw Response Length:', typeof content === 'string' ? content.length : JSON.stringify(content).length);
      console.log('Raw Response:', content);
      console.log('================================');

      // Fireworks usually returns a string content for text responses
      let parsedResponse: MuscleAnalysisResponse;
      try {
        const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
        const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          let jsonString = jsonMatch[0];
          if (!this.isValidJSON(jsonString)) {
            console.log('🔧 Detected truncated JSON, attempting to fix...');
            jsonString = this.fixTruncatedJSON(jsonString);
          }
          parsedResponse = JSON.parse(jsonString);
        } else {
          if (!this.isValidJSON(contentStr)) {
            console.log('🔧 Detected truncated JSON in full content, attempting to fix...');
            const fixedContent = this.fixTruncatedJSON(contentStr);
            parsedResponse = JSON.parse(fixedContent);
          } else {
            parsedResponse = JSON.parse(contentStr);
          }
        }
      } catch (parseError) {
        console.error('Failed to parse JSON from AI response:', parseError);
        throw new Error('AI response is not valid JSON');
      }

      // Validate the response structure
      this.validateAnalysisResponse(parsedResponse);

      // Log parsed muscle analysis to terminal
      console.log('=== MUSCLE ANALYSIS RESULTS ===');
      console.log('Overall Physique Score:', parsedResponse.overall_assessment.overall_physique_score);
      console.log('Body Symmetry Score:', parsedResponse.overall_assessment.body_symmetry_score);
      console.log('Muscle Analysis:');
      parsedResponse.muscle_analysis.forEach((muscle) => {
        console.log(`  ${muscle.muscle_name}: ${muscle.development_score}/10 (${muscle.development_category})`);
      });
      console.log('Recommendations:', parsedResponse.recommendations.length, 'items');
      console.log('===============================');

      return parsedResponse;
    } catch (error) {
      console.error('Failed to parse API response:', error);
      throw new Error('Invalid response format from AI');
    }
  }

  private isValidJSON(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  private fixTruncatedJSON(jsonString: string): string {
    try {
      let cleaned = jsonString.trim();

      // Count open and close braces
      let openBraces = (cleaned.match(/\{/g) || []).length;
      let closeBraces = (cleaned.match(/\}/g) || []).length;
      while (closeBraces < openBraces) {
        cleaned += '}';
        closeBraces++;
      }

      // Count open and close brackets
      let openBrackets = (cleaned.match(/\[/g) || []).length;
      let closeBrackets = (cleaned.match(/\]/g) || []).length;
      while (closeBrackets < openBrackets) {
        cleaned += ']';
        closeBrackets++;
      }

      // Remove trailing commas
      cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

      if (!this.isValidJSON(cleaned)) {
        const lastCompleteMatch = cleaned.match(/^.*\}(?=\s*$)/s);
        if (lastCompleteMatch) {
          cleaned = lastCompleteMatch[0];
        }
      }

      console.log('🔧 Fixed JSON length:', cleaned.length);
      return cleaned;
    } catch (error) {
      console.error('Failed to fix truncated JSON:', error);
      throw new Error('Unable to fix truncated JSON response');
    }
  }

  private validateAnalysisResponse(data: any): void {
    const requiredFields = ['analysis_metadata', 'muscle_analysis', 'overall_assessment', 'recommendations'];
    for (const field of requiredFields) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!data.analysis_metadata.image_quality || typeof data.analysis_metadata.analysis_confidence !== 'number') {
      throw new Error('Invalid analysis metadata');
    }

    if (!Array.isArray(data.muscle_analysis) || data.muscle_analysis.length === 0) {
      throw new Error('Invalid muscle analysis data');
    }

    for (const muscle of data.muscle_analysis) {
      if (!muscle.muscle_name || typeof muscle.development_score !== 'number' || muscle.development_score < 1 || muscle.development_score > 10) {
        throw new Error('Invalid muscle analysis entry');
      }
    }
  }

  private handleError(error: any): APIError {
    console.error('🚨 === ERROR HANDLER ACTIVATED (FIREWORKS) ===');
    console.error('🔍 Error type:', typeof error);
    console.error('📝 Error message:', error?.message);
    console.error('🏗️ Error constructor:', error?.constructor?.name);

    if (axios.isAxiosError(error)) {
      console.error('🌐 This is an Axios error');

      if (!error.response) {
        console.error('❌ Network error - no response received');
        console.error('🔗 Possible causes: No internet, DNS issues, server down');
        return {
          code: APIErrorCode.NETWORK_ERROR,
          message: error.message,
          retryable: true,
          userMessage: ERROR_MESSAGES.NETWORK_ERROR,
        };
      }

      const status = error.response.status;
      const data = error.response.data;
      console.error('📊 HTTP Status:', status);
      console.error('📄 Response data:', data);
      console.error('🔗 Request URL:', error.config?.url);
      console.error('🔑 Auth header present:', !!error.config?.headers?.Authorization);

      switch (status) {
        case 401:
          console.error('🔐 Authentication failed - check API key');
          return {
            code: APIErrorCode.AUTH_ERROR,
            message: 'Authentication failed - Invalid API key',
            details: data,
            retryable: false,
            userMessage: 'Authentication Error: Invalid or missing API key. Set EXPO_PUBLIC_FIREWORKS_API_KEY in your .env and restart the app.',
          };
        case 404:
          console.error('🔎 Model not found or inaccessible');
          return {
            code: APIErrorCode.UNKNOWN_ERROR,
            message: 'Model not found or inaccessible',
            details: data,
            retryable: false,
            userMessage: 'Model Error: The requested model was not found or is inaccessible. Verify model ID (accounts/fireworks/models/llama-v3p2-11b-vision-instruct), serverless availability, and API key permissions.',
          };
        case 429:
          console.error('🚦 Rate limit exceeded');
          return {
            code: APIErrorCode.RATE_LIMIT,
            message: 'Rate limit exceeded',
            details: data,
            retryable: true,
            userMessage: ERROR_MESSAGES.RATE_LIMIT,
          };
        case 408:
        case 504:
          console.error('⏰ Request timeout');
          return {
            code: APIErrorCode.API_TIMEOUT,
            message: 'Request timeout',
            details: data,
            retryable: true,
            userMessage: ERROR_MESSAGES.API_TIMEOUT,
          };
        case 400:
          console.error('📝 Bad request - check request format');
          return {
            code: APIErrorCode.UNKNOWN_ERROR,
            message: `Bad request: ${JSON.stringify(data)}`,
            details: data,
            retryable: false,
            userMessage: 'Request Error: Invalid request format. Please try with a different image.',
          };
        case 403:
          console.error('🚫 Forbidden - insufficient permissions');
          return {
            code: APIErrorCode.AUTH_ERROR,
            message: 'Forbidden - insufficient permissions',
            details: data,
            retryable: false,
            userMessage: 'Permission Error: Your API key does not have sufficient permissions.',
          };
        default:
          if (status >= 500) {
            console.error('🔥 Server error');
            return {
              code: APIErrorCode.SERVER_ERROR,
              message: `Server error: ${status}`,
              details: data,
              retryable: true,
              userMessage: `Server Error (${status}): The AI service is temporarily unavailable. Please try again later.`,
            };
          } else {
            console.error('❓ Unexpected HTTP status');
            return {
              code: APIErrorCode.UNKNOWN_ERROR,
              message: `HTTP ${status}: ${JSON.stringify(data)}`,
              details: data,
              retryable: false,
              userMessage: `Unexpected Error (${status}): Please try again or contact support.`,
            };
          }
      }
    }

    console.error('🔥 Non-Axios error occurred');
    console.error('📋 Full error object:', error);

    return {
      code: APIErrorCode.UNKNOWN_ERROR,
      message: error.message || 'Unknown error occurred',
      retryable: false,
      userMessage: `Unexpected Error: ${error.message || 'Something went wrong'}. Please try again.`,
    };
  }

  public cancelCurrentRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      const testRequest = {
        model: API_CONFIG.FIREWORKS_MODEL,
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: 'Test connection' }],
          },
        ],
        max_tokens: 10,
      };


      await this.axiosInstance.post('', testRequest, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });

      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}
