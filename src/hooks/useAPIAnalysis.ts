// Custom Hook for API Analysis - Manages the complete analysis flow

import { useState, useEffect, useCallback } from 'react';
import { 
  MuscleAnalysisResponse, 
  APIResponse, 
  APIState,
  APIError 
} from '../types/api.types';
import { FireworksAIService } from '../services/api/FireworksAIService';
import { APIStateManager } from '../services/api/APIStateManager';
import { CacheManager } from '../services/cache/CacheManager';
import { QueueManager } from '../services/queue/QueueManager';

interface UseAPIAnalysisOptions {
  enableCache?: boolean;
  enableQueue?: boolean;
  onProgress?: (state: APIState) => void;
  onSuccess?: (result: MuscleAnalysisResponse) => void;
  onError?: (error: APIError) => void;
}

export const useAPIAnalysis = (options: UseAPIAnalysisOptions = {}) => {
  const {
    enableCache = true,
    enableQueue = true,
    onProgress,
    onSuccess,
    onError,
  } = options;

  const [state, setState] = useState<APIState>({
    isLoading: false,
    progress: 0,
    statusMessage: '',
    error: null,
    retryCount: 0,
  });

  const [result, setResult] = useState<MuscleAnalysisResponse | null>(null);
  const [history, setHistory] = useState<MuscleAnalysisResponse[]>([]);

  const apiService = FireworksAIService.getInstance();
  
  const stateManager = APIStateManager.getInstance();
  const cacheManager = CacheManager.getInstance();
  const queueManager = QueueManager.getInstance();

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = stateManager.subscribe((newState) => {
      setState(newState);
      onProgress?.(newState);
    });

    return unsubscribe;
  }, [onProgress]);

  /**
   * Analyze image
   */
  const analyzeImage = useCallback(async (imageUri: string) => {
    console.log('🎯 === HOOK: Starting Image Analysis ===');
    console.log('📱 Service Mode: LIVE API');
    console.log('📸 Image URI:', imageUri);
    console.log('💾 Cache Enabled:', enableCache);
    console.log('📋 Queue Enabled:', enableQueue);
    
    try {
      // Reset state
      console.log('🔄 Resetting analysis state...');
      stateManager.reset();
      stateManager.setLoading(true, 'Starting analysis...');

      // Check cache first if enabled
      if (enableCache) {
        console.log('🔍 Checking cache for existing analysis...');
        const cached = await cacheManager.getCachedAnalysis(imageUri);
        if (cached) {
          console.log('✅ Found cached result, using cached data');
          stateManager.updateProgress(100, 'Loaded from cache');
          setResult(cached);
          onSuccess?.(cached);
          stateManager.setLoading(false);
          return cached;
        }
        console.log('❌ No cached result found');
      }

      // Add to queue if enabled
      if (enableQueue) {
        console.log('📋 Adding request to queue...');
        const requestId = await queueManager.addToQueue(imageUri);
        console.log('✅ Request queued with ID:', requestId);
        stateManager.updateProgress(5, `Request queued (ID: ${requestId})`);
      }

      // Perform analysis
      console.log('🚀 Calling API service for analysis...');
      console.log('🔧 Service type:', apiService.constructor.name);
      
      const response = await apiService.analyzeMuscleImage(
        imageUri,
        (progressState) => {
          console.log('📊 Progress update:', progressState.progress + '%', '-', progressState.statusMessage);
          stateManager.updateState(progressState);
        }
      );

      console.log('📥 Received response from API service');
      console.log('✅ Response success:', response.success);
      
      if (response.success && response.data) {
        console.log('🎉 Analysis successful, updating state...');
        setResult(response.data);
        setHistory(prev => [...prev, response.data!]);
        onSuccess?.(response.data);
        stateManager.updateProgress(100, 'Analysis complete');
      } else if (response.error) {
        console.error('❌ API returned error:', response.error);
        stateManager.setError(response.error);
        onError?.(response.error);
      }

      stateManager.setLoading(false);
      console.log('🏁 Analysis process completed');
      return response.data || null;

    } catch (error) {
      console.error('💥 === HOOK: Analysis Exception ===');
      console.error('❌ Error in useAPIAnalysis:', error);
      console.error('🔍 Error type:', typeof error);
      console.error('📝 Error message:', (error as any)?.message || 'Unknown error');
      console.error('=====================================');
      
      const apiError: APIError = {
        code: 'UNKNOWN_ERROR',
        message: (error as any)?.message || 'Analysis failed',
        retryable: false,
        userMessage: 'An unexpected error occurred during analysis',
      };
      
      stateManager.setError(apiError);
      onError?.(apiError);
      return null;
    }
  }, [apiService, enableCache, enableQueue, onSuccess, onError]);

  /**
   * Retry analysis
   */
  const retry = useCallback(async (imageUri: string) => {
    stateManager.incrementRetry();
    return analyzeImage(imageUri);
  }, [analyzeImage]);

  /**
   * Cancel current analysis
   */
  const cancel = useCallback(() => {
    apiService.cancelCurrentRequest();
    stateManager.reset();
  }, [apiService]);

  /**
   * Clear cache
   */
  const clearCache = useCallback(async () => {
    await cacheManager.clearCache();
  }, []);

  /**
   * Get cache stats
   */
  const getCacheStats = useCallback(async () => {
    return await cacheManager.getCacheStats();
  }, []);

  /**
   * Clear history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  /**
   * Test API connection
   */
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      stateManager.setLoading(true, 'Testing connection...');
      const isConnected = await apiService.testConnection();
      stateManager.setLoading(false);
      return isConnected;
    } catch (error) {
      stateManager.setLoading(false);
      return false;
    }
  }, [apiService]);


  return {
    // State
    state,
    result,
    history,
    
    // Actions
    analyzeImage,
    retry,
    cancel,
    clearCache,
    clearHistory,
    getCacheStats,
    testConnection,
    
    // Flags
    isLoading: state.isLoading,
    hasError: !!state.error,
    progress: state.progress,
  };
};
