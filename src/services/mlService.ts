import { UserProfile } from '../utils/userBehaviorTracker';
import { Show } from '../types';
import { Platform } from 'react-native';

// Dynamic import for TensorFlow.js to handle cases where it's not available
let tf: any = null;
let tfReactNative: any = null;

interface UserFeatures {
  favoriteArtists: number[];
  favoriteVenues: number[];
  timePreferences: number[];
  dayPreferences: number[];
}

interface EventFeatures {
  artistId: number;
  venueId: number;
  timeOfDay: number;
  dayOfWeek: number;
  hasEventLink: number;
  hasMapLink: number;
}

class RecommendationModel {
  private isInitialized = false;
  private model: any = null;
  private vocabSize = 1000;
  private useTensorFlow = false;

  async initialize() {
    if (this.isInitialized) return;
    
    // Try to load TensorFlow.js
    try {
      // Dynamic import for TensorFlow.js
      tf = await import('@tensorflow/tfjs');
      
      // For React Native, initialize the platform
      if (Platform.OS !== 'web') {
        try {
          tfReactNative = await import('@tensorflow/tfjs-react-native');
          // Initialize React Native platform (required before using TensorFlow)
          await tfReactNative.initializeAsync();
          
          // Register CPU backend explicitly for React Native
          const cpuBackend = await import('@tensorflow/tfjs-backend-cpu');
          await tf.setBackend('cpu');
          await tf.ready();
          
          console.log('TensorFlow.js React Native initialized with CPU backend');
        } catch (error) {
          console.log('TensorFlow.js React Native setup failed, trying basic initialization:', error);
          // Try basic initialization without React Native specific setup
          await tf.ready();
        }
      } else {
        // Web platform
        await tf.ready();
      }
      
      // Verify TensorFlow is ready
      if (!tf.ready()) {
        throw new Error('TensorFlow.js not ready');
      }
      
      // Create the model
      this.model = this.createModel(tf);
      this.useTensorFlow = true;
      this.isInitialized = true;
      
      console.log('✅ TensorFlow.js initialized successfully - Neural network ready');
    } catch (error) {
      console.log('⚠️ TensorFlow.js not available, using enhanced scoring algorithm:', error);
      this.useTensorFlow = false;
      this.isInitialized = true; // Still initialized, just without TensorFlow
    }
  }

  private createModel(tfLib: any): any {
    // Create a neural network model for recommendation scoring
    const model = tfLib.sequential({
      layers: [
        // Input layer: 10 features (user + event features)
        tfLib.layers.dense({
          inputShape: [10],
          units: 32,
          activation: 'relu',
          name: 'hidden1',
        }),
        tfLib.layers.dropout({ rate: 0.2 }),
        // Hidden layer 2
        tfLib.layers.dense({
          units: 16,
          activation: 'relu',
          name: 'hidden2',
        }),
        tfLib.layers.dropout({ rate: 0.2 }),
        // Output layer: single score (0-1)
        tfLib.layers.dense({
          units: 1,
          activation: 'sigmoid',
          name: 'output',
        }),
      ],
    });

    // Compile the model
    model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
    });

    return model;
  }

  buildFeatureVector(
    userFeatures: UserFeatures,
    eventFeatures: EventFeatures
  ): number[] {
    // Normalize and combine features
    const normalizedArtists = this.normalizeArray(userFeatures.favoriteArtists);
    const normalizedVenues = this.normalizeArray(userFeatures.favoriteVenues);
    const normalizedTime = this.normalizeArray(userFeatures.timePreferences);
    const normalizedDay = this.normalizeArray(userFeatures.dayPreferences);

    // Combine into single feature vector
    return [
      // Artist preference (normalized)
      normalizedArtists[0] || 0,
      // Venue preference (normalized)
      normalizedVenues[0] || 0,
      // Time preferences (4 values)
      ...normalizedTime.slice(0, 4),
      // Day preferences (normalized)
      normalizedDay[0] || 0,
      // Event features (normalized)
      eventFeatures.artistId / this.vocabSize,
      eventFeatures.venueId / this.vocabSize,
      eventFeatures.timeOfDay / 4,
      eventFeatures.dayOfWeek / 7,
      eventFeatures.hasEventLink,
      eventFeatures.hasMapLink,
    ].slice(0, 10); // Ensure exactly 10 features
  }

  async predictScore(
    userFeatures: UserFeatures,
    eventFeatures: EventFeatures
  ): Promise<number> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Use TensorFlow.js if available
    if (this.useTensorFlow && this.model && tf) {
      try {
        const features = this.buildFeatureVector(userFeatures, eventFeatures);
        const input = tf.tensor2d([features]);
        const prediction = this.model.predict(input);
        const scoreArray = await prediction.data();
        const score = scoreArray[0];
        
        // Cleanup tensors to prevent memory leaks
        input.dispose();
        prediction.dispose();
        
        return score;
      } catch (error) {
        console.error('TensorFlow.js prediction error:', error);
        // Fallback to enhanced scoring
        return this.enhancedScore(userFeatures, eventFeatures);
      }
    }
    
    // Fallback to enhanced scoring if TensorFlow.js not available
    return this.enhancedScore(userFeatures, eventFeatures);
  }

  private enhancedScore(
    userFeatures: UserFeatures,
    eventFeatures: EventFeatures
  ): number {
    // Enhanced scoring algorithm (no TensorFlow.js required)
    // Uses weighted features similar to a neural network
    
    let score = 0.0;
    
    // 1. Artist preference (40% weight)
    if (userFeatures.favoriteArtists.length > 0) {
      const maxArtist = Math.max(...userFeatures.favoriteArtists);
      const normalizedArtist = Math.min(maxArtist / 10, 1.0); // Normalize to 0-1
      score += normalizedArtist * 0.4;
    }
    
    // 2. Venue preference (30% weight)
    if (userFeatures.favoriteVenues.length > 0) {
      const maxVenue = Math.max(...userFeatures.favoriteVenues);
      const normalizedVenue = Math.min(maxVenue / 10, 1.0);
      score += normalizedVenue * 0.3;
    }
    
    // 3. Time preference (20% weight)
    if (userFeatures.timePreferences.length >= 4) {
      const timeIndex = Math.floor(eventFeatures.timeOfDay);
      if (timeIndex >= 0 && timeIndex < 4) {
        const timeCount = userFeatures.timePreferences[timeIndex] || 0;
        const totalTime = userFeatures.timePreferences.reduce((a, b) => a + b, 0);
        if (totalTime > 0) {
          const timeScore = timeCount / totalTime;
          score += timeScore * 0.2;
        }
      }
    }
    
    // 4. Feature bonuses (10% weight)
    let featureBonus = 0;
    if (eventFeatures.hasEventLink) featureBonus += 0.03;
    if (eventFeatures.hasMapLink) featureBonus += 0.02;
    // Day preference (if we had day data)
    featureBonus += 0.05; // Small base bonus
    score += featureBonus;
    
    // Apply sigmoid-like function for smooth output
    return 1 / (1 + Math.exp(-(score - 0.5) * 4)); // Sigmoid centered at 0.5
  }
  
  // Keep old method name for compatibility
  private simpleScore(
    userFeatures: UserFeatures,
    eventFeatures: EventFeatures
  ): number {
    return this.enhancedScore(userFeatures, eventFeatures);
  }

  async trainModel(trainingData: Array<{
    userFeatures: UserFeatures;
    eventFeatures: EventFeatures;
    label: number; // 1 if favorited, 0 if not
  }>) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Only train if TensorFlow.js is available and we have enough data
    if (!this.useTensorFlow || !this.model || !tf || trainingData.length < 10) {
      console.log('Skipping training: TensorFlow not available or insufficient data');
      return;
    }

    try {
      // Prepare training data
      const xs = tf.tensor2d(
        trainingData.map(d => this.buildFeatureVector(d.userFeatures, d.eventFeatures))
      );
      const ys = tf.tensor2d(
        trainingData.map(d => [d.label])
      );

      // Train the model
      await this.model.fit(xs, ys, {
        epochs: 10,
        batchSize: Math.min(32, trainingData.length),
        validationSplit: 0.2,
        verbose: 0, // Suppress training logs
      });

      // Cleanup
      xs.dispose();
      ys.dispose();
      
      console.log('Model trained successfully');
    } catch (error) {
      console.error('Error training TensorFlow model:', error);
    }
  }

  private normalizeArray(arr: number[]): number[] {
    if (arr.length === 0) return [0];
    const max = Math.max(...arr, 1);
    return arr.map(x => x / max);
  }

  dispose() {
    // Cleanup TensorFlow.js model
    if (this.model) {
      try {
        this.model.dispose();
      } catch (error) {
        console.error('Error disposing model:', error);
      }
      this.model = null;
    }
    this.isInitialized = false;
    this.useTensorFlow = false;
  }
  
  isUsingTensorFlow(): boolean {
    return this.useTensorFlow;
  }
}

export const mlService = new RecommendationModel();
