# AI-Enhanced Smart Recommendations

## Overview
Integrating AI/ML capabilities to provide more intelligent, personalized, and explainable event recommendations.

## AI Integration Options

### Option 1: On-Device AI (Privacy-First)
- **TensorFlow.js** or **React Native ML**
- Train models locally on device
- No data leaves device
- Works offline

### Option 2: Cloud AI APIs (More Powerful)
- **OpenAI GPT-4** for natural language understanding
- **Anthropic Claude** for recommendations
- **Google Gemini** for multi-modal understanding
- Requires API keys, costs money

### Option 3: Hybrid Approach (Recommended)
- On-device ML for basic recommendations
- Cloud AI for advanced features and explanations
- Best of both worlds

## Recommended Implementation: Hybrid Approach

### Architecture

```
User Behavior → Local ML Model → Basic Recommendations
                ↓
            Cloud AI API → Enhanced Scoring + Explanations
                ↓
            Final Recommendations with AI Explanations
```

## Implementation Plan

### Phase 1: On-Device ML (TensorFlow.js)

#### 1.1 Install Dependencies

```bash
npm install @tensorflow/tfjs @tensorflow/tfjs-react-native
npm install @react-native-async-storage/async-storage
```

#### 1.2 Create ML Model Service

```typescript
// src/services/mlService.ts
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { bundleResourceIO } from '@tensorflow/tfjs-react-native';
import { Show } from '../types';

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
  private model: tf.LayersModel | null = null;
  private artistVocab: Map<string, number> = new Map();
  private venueVocab: Map<string, number> = new Map();
  private vocabSize = 1000;

  async initialize() {
    // Initialize TensorFlow.js
    await tf.ready();
    
    // Create or load model
    this.model = await this.createModel();
  }

  private async createModel(): Promise<tf.LayersModel> {
    // Neural network for recommendation scoring
    const model = tf.sequential({
      layers: [
        // Input layer: user features + event features
        tf.layers.dense({
          inputShape: [10], // Combined feature vector
          units: 64,
          activation: 'relu',
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        // Output: recommendation score (0-1)
        tf.layers.dense({ units: 1, activation: 'sigmoid' }),
      ],
    });

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
    // Combine user and event features into single vector
    return [
      ...this.normalizeArray(userFeatures.favoriteArtists),
      ...this.normalizeArray(userFeatures.favoriteVenues),
      ...userFeatures.timePreferences,
      ...userFeatures.dayPreferences,
      eventFeatures.artistId / this.vocabSize,
      eventFeatures.venueId / this.vocabSize,
      eventFeatures.timeOfDay / 4,
      eventFeatures.dayOfWeek / 7,
      eventFeatures.hasEventLink,
      eventFeatures.hasMapLink,
    ];
  }

  async predictScore(
    userFeatures: UserFeatures,
    eventFeatures: EventFeatures
  ): Promise<number> {
    if (!this.model) {
      await this.initialize();
    }

    const features = this.buildFeatureVector(userFeatures, eventFeatures);
    const input = tf.tensor2d([features]);
    const prediction = await this.model!.predict(input) as tf.Tensor;
    const score = await prediction.data();
    input.dispose();
    prediction.dispose();
    
    return score[0];
  }

  async trainModel(trainingData: Array<{
    userFeatures: UserFeatures;
    eventFeatures: EventFeatures;
    label: number; // 1 if favorited, 0 if not
  }>) {
    if (!this.model) {
      await this.initialize();
    }

    // Prepare training data
    const xs = tf.tensor2d(
      trainingData.map(d => this.buildFeatureVector(d.userFeatures, d.eventFeatures))
    );
    const ys = tf.tensor2d(
      trainingData.map(d => [d.label])
    );

    // Train model
    await this.model!.fit(xs, ys, {
      epochs: 10,
      batchSize: 32,
      validationSplit: 0.2,
    });

    xs.dispose();
    ys.dispose();
  }

  private normalizeArray(arr: number[]): number[] {
    const max = Math.max(...arr, 1);
    return arr.map(x => x / max);
  }
}

export const mlService = new RecommendationModel();
```

### Phase 2: Cloud AI Integration (OpenAI/Anthropic)

#### 2.1 AI Service for Enhanced Recommendations

```typescript
// src/services/aiService.ts
import { Show } from '../types';

interface AIRecommendationResponse {
  score: number;
  explanation: string;
  reasoning: string[];
  confidence: number;
}

class AIService {
  private apiKey: string | null = null;
  private baseUrl = 'https://api.openai.com/v1/chat/completions';
  // Alternative: Anthropic Claude
  // private baseUrl = 'https://api.anthropic.com/v1/messages';

  constructor() {
    // Load API key from environment or secure storage
    this.apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || null;
  }

  async getRecommendationExplanation(
    show: Show,
    userFavorites: Show[],
    userProfile: any
  ): Promise<AIRecommendationResponse> {
    if (!this.apiKey) {
      // Fallback to rule-based explanation
      return this.getFallbackExplanation(show, userFavorites);
    }

    try {
      const prompt = this.buildPrompt(show, userFavorites, userProfile);
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Cost-effective model
          messages: [
            {
              role: 'system',
              content: `You are a music event recommendation assistant. Analyze user preferences and explain why an event might be recommended. Be concise and specific.`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 150,
        }),
      });

      const data = await response.json();
      const explanation = data.choices[0]?.message?.content || '';

      return {
        score: this.extractScore(explanation),
        explanation: this.parseExplanation(explanation),
        reasoning: this.parseReasoning(explanation),
        confidence: 0.85,
      };
    } catch (error) {
      console.error('AI API error:', error);
      return this.getFallbackExplanation(show, userFavorites);
    }
  }

  private buildPrompt(show: Show, favorites: Show[], profile: any): string {
    const favoriteArtists = [...new Set(favorites.map(f => f.artist))].slice(0, 10);
    const favoriteVenues = [...new Set(favorites.map(f => f.venue))].slice(0, 10);
    
    return `Analyze if this event should be recommended to the user:

Event: ${show.artist} at ${show.venue}${show.time ? ` at ${show.time}` : ''}

User's favorite artists: ${favoriteArtists.join(', ') || 'None yet'}
User's favorite venues: ${favoriteVenues.join(', ') || 'None yet'}
User's time preferences: ${JSON.stringify(profile.timePreferences)}

Provide:
1. A recommendation score (0-100)
2. A brief explanation (1-2 sentences)
3. Specific reasons why this event matches their preferences

Format as JSON:
{
  "score": 75,
  "explanation": "This event matches your preferences because...",
  "reasons": ["Reason 1", "Reason 2"]
}`;
  }

  private extractScore(explanation: string): number {
    // Extract score from AI response
    const match = explanation.match(/"score":\s*(\d+)/);
    return match ? parseInt(match[1]) : 50;
  }

  private parseExplanation(explanation: string): string {
    const match = explanation.match(/"explanation":\s*"([^"]+)"/);
    return match ? match[1] : 'Recommended based on your preferences';
  }

  private parseReasoning(explanation: string): string[] {
    const match = explanation.match(/"reasons":\s*\[(.*?)\]/);
    if (!match) return [];
    
    return match[1]
      .split(',')
      .map(r => r.trim().replace(/"/g, ''))
      .filter(r => r.length > 0);
  }

  private getFallbackExplanation(show: Show, favorites: Show[]): AIRecommendationResponse {
    // Rule-based fallback when AI is unavailable
    const matchingArtists = favorites.filter(f => f.artist === show.artist).length;
    const matchingVenues = favorites.filter(f => f.venue === show.venue).length;
    
    let score = 50;
    const reasons: string[] = [];
    
    if (matchingArtists > 0) {
      score += 30;
      reasons.push(`You've favorited ${show.artist} ${matchingArtists} time${matchingArtists > 1 ? 's' : ''}`);
    }
    
    if (matchingVenues > 0) {
      score += 20;
      reasons.push(`You've been to ${show.venue} ${matchingVenues} time${matchingVenues > 1 ? 's' : ''}`);
    }
    
    return {
      score: Math.min(score, 100),
      explanation: reasons.length > 0 
        ? `Matches your preferences: ${reasons.join(', ')}`
        : 'Similar to events you might enjoy',
      reasoning: reasons,
      confidence: 0.6,
    };
  }

  // Batch processing for multiple events
  async getBatchRecommendations(
    shows: Show[],
    userFavorites: Show[],
    userProfile: any
  ): Promise<Map<string, AIRecommendationResponse>> {
    // Process in batches to avoid rate limits
    const batchSize = 5;
    const results = new Map<string, AIRecommendationResponse>();
    
    for (let i = 0; i < shows.length; i += batchSize) {
      const batch = shows.slice(i, i + batchSize);
      const promises = batch.map(show => 
        this.getRecommendationExplanation(show, userFavorites, userProfile)
          .then(result => ({ show, result }))
      );
      
      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ show, result }) => {
        const key = `${show.artist}|${show.venue}|${show.time || ''}`;
        results.set(key, result);
      });
      
      // Rate limiting: wait between batches
      if (i + batchSize < shows.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
}

export const aiService = new AIService();
```

### Phase 3: Enhanced Recommendation Engine

```typescript
// src/utils/aiRecommendationEngine.ts
import { Show, EventDay } from '../types';
import { getUserProfile } from './userBehaviorTracker';
import { mlService } from '../services/mlService';
import { aiService } from '../services/aiService';
import { RecommendationScore } from './recommendationEngine';

interface AIRecommendationScore extends RecommendationScore {
  aiExplanation: string;
  aiReasoning: string[];
  confidence: number;
  mlScore?: number;
}

export async function getAIRecommendations(
  events: EventDay[],
  favorites: Show[],
  useAI: boolean = true,
  useML: boolean = true,
  limit: number = 10
): Promise<AIRecommendationScore[]> {
  const profile = await getUserProfile();
  
  if (!profile || profile.totalInteractions < 3) {
    return [];
  }

  const scores: AIRecommendationScore[] = [];
  const favoriteKeys = new Set(favorites.map(s => `${s.artist}|${s.venue}|${s.time || ''}`));

  // Collect all candidate events
  const candidates: Show[] = [];
  for (const day of events) {
    for (const show of day.shows) {
      const showKey = `${show.artist}|${show.venue}|${show.time || ''}`;
      if (!favoriteKeys.has(showKey)) {
        candidates.push(show);
      }
    }
  }

  // Get AI recommendations in batch (if enabled)
  let aiResults: Map<string, any> = new Map();
  if (useAI && candidates.length > 0) {
    try {
      aiResults = await aiService.getBatchRecommendations(
        candidates.slice(0, 20), // Limit to top 20 for cost control
        favorites,
        profile
      );
    } catch (error) {
      console.error('AI recommendation error:', error);
    }
  }

  // Score each event
  for (const show of candidates) {
    const showKey = `${show.artist}|${show.venue}|${show.time || ''}`;
    const aiResult = aiResults.get(showKey);
    
    const score: AIRecommendationScore = {
      show,
      score: 0,
      reasons: [],
      aiExplanation: aiResult?.explanation || '',
      aiReasoning: aiResult?.reasoning || [],
      confidence: aiResult?.confidence || 0.5,
    };

    // Combine rule-based, ML, and AI scores
    let ruleBasedScore = 0;
    
    // Rule-based scoring (40% weight)
    const artistCount = profile.favoriteArtists[show.artist] || 0;
    const venueCount = profile.favoriteVenues[show.venue] || 0;
    ruleBasedScore += Math.min(artistCount * 20, 100) * 0.4;
    ruleBasedScore += Math.min(venueCount * 15, 100) * 0.3;
    
    // ML score (30% weight if available)
    let mlScore = 0;
    if (useML) {
      try {
        mlScore = await mlService.predictScore(
          convertProfileToFeatures(profile),
          convertShowToFeatures(show)
        ) * 100;
        score.mlScore = mlScore;
      } catch (error) {
        console.error('ML prediction error:', error);
      }
    }
    
    // AI score (30% weight if available)
    const aiScore = aiResult?.score || 0;
    
    // Combine scores
    score.score = (
      ruleBasedScore * 0.4 +
      mlScore * 0.3 +
      aiScore * 0.3
    );

    // Combine reasons
    if (artistCount > 0) {
      score.reasons.push(`You've favorited ${show.artist} ${artistCount} time${artistCount > 1 ? 's' : ''}`);
    }
    if (venueCount > 0) {
      score.reasons.push(`You've been to ${show.venue} ${venueCount} time${venueCount > 1 ? 's' : ''}`);
    }
    score.reasons.push(...score.aiReasoning);

    if (score.score > 20) {
      scores.push(score);
    }
  }

  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Helper functions for ML feature conversion
function convertProfileToFeatures(profile: any) {
  // Convert user profile to ML features
  return {
    favoriteArtists: Object.values(profile.favoriteArtists) as number[],
    favoriteVenues: Object.values(profile.favoriteVenues) as number[],
    timePreferences: [
      profile.timePreferences.morning,
      profile.timePreferences.afternoon,
      profile.timePreferences.evening,
      profile.timePreferences.lateNight,
    ],
    dayPreferences: Object.values(profile.dayPreferences) as number[],
  };
}

function convertShowToFeatures(show: Show) {
  // Convert show to ML features
  const hour = show.time ? parseInt(show.time.split(':')[0]) : 12;
  let timeOfDay = 2; // Default to evening
  if (hour >= 6 && hour < 12) timeOfDay = 0; // morning
  else if (hour >= 12 && hour < 17) timeOfDay = 1; // afternoon
  else if (hour >= 17 && hour < 22) timeOfDay = 2; // evening
  else timeOfDay = 3; // late night

  return {
    artistId: hashString(show.artist) % 1000,
    venueId: hashString(show.venue) % 1000,
    timeOfDay,
    dayOfWeek: new Date().getDay(),
    hasEventLink: show.eventLink ? 1 : 0,
    hasMapLink: show.mapLink ? 1 : 0,
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
```

### Phase 4: Enhanced UI with AI Explanations

```typescript
// src/components/AIRecommendationBadge.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface AIRecommendationBadgeProps {
  explanation: string;
  reasoning: string[];
  confidence: number;
}

export const AIRecommendationBadge: React.FC<AIRecommendationBadgeProps> = ({
  explanation,
  reasoning,
  confidence,
}) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const styles = createStyles(colors);

  if (!explanation && reasoning.length === 0) return null;

  return (
    <TouchableOpacity
      onPress={() => setExpanded(!expanded)}
      style={styles.container}
      activeOpacity={0.7}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeText}>🤖 AI Recommended</Text>
        {confidence > 0.8 && (
          <Text style={styles.confidenceText}>High confidence</Text>
        )}
      </View>
      
      {expanded && (
        <View style={styles.expandedContent}>
          <Text style={styles.explanation}>{explanation}</Text>
          {reasoning.length > 0 && (
            <View style={styles.reasoningContainer}>
              {reasoning.map((reason, index) => (
                <Text key={index} style={styles.reason}>
                  • {reason}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    marginLeft: 8,
  },
  badge: {
    backgroundColor: colors.pink,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: '600',
  },
  confidenceText: {
    fontSize: 8,
    color: colors.white,
    opacity: 0.8,
  },
  expandedContent: {
    marginTop: 8,
    padding: 12,
    backgroundColor: colors.grayLight,
    borderRadius: 8,
    maxWidth: 300,
  },
  explanation: {
    fontSize: 12,
    color: colors.text,
    marginBottom: 8,
  },
  reasoningContainer: {
    marginTop: 4,
  },
  reason: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
});
```

## Configuration & Setup

### Environment Variables

```bash
# .env
EXPO_PUBLIC_OPENAI_API_KEY=sk-...
# Or use Anthropic
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...
```

### Feature Flags

```typescript
// src/config/features.ts
export const FEATURES = {
  AI_RECOMMENDATIONS: process.env.EXPO_PUBLIC_ENABLE_AI === 'true',
  ML_RECOMMENDATIONS: process.env.EXPO_PUBLIC_ENABLE_ML === 'true',
  AI_EXPLANATIONS: process.env.EXPO_PUBLIC_ENABLE_AI_EXPLANATIONS === 'true',
};
```

## Cost Considerations

### OpenAI Pricing (as of 2024)
- GPT-4o-mini: ~$0.15 per 1M input tokens, $0.60 per 1M output tokens
- Average request: ~500 tokens input, ~100 tokens output
- Cost per recommendation: ~$0.0001
- 100 recommendations/day: ~$0.01/day = ~$3.65/year

### Cost Optimization Strategies
1. **Caching**: Cache AI explanations for 24 hours
2. **Batch Processing**: Process multiple events in one request
3. **Smart Triggering**: Only use AI for top 20 candidates
4. **Fallback**: Use rule-based when AI unavailable
5. **User Control**: Let users enable/disable AI features

## Privacy & Security

1. **API Key Security**: Store in secure storage, never commit to git
2. **Data Minimization**: Only send necessary data to AI
3. **User Consent**: Ask permission before using AI
4. **Local-First**: AI enhances, doesn't replace local recommendations
5. **Opt-Out**: Users can disable AI features

## Testing Strategy

1. **Unit Tests**: Test AI service mocking
2. **Integration Tests**: Test full recommendation flow
3. **Cost Monitoring**: Track API usage
4. **A/B Testing**: Compare AI vs non-AI recommendations
5. **Performance Tests**: Ensure AI doesn't slow down app

## Future Enhancements

1. **Fine-Tuned Models**: Train custom model on user data
2. **Multi-Modal AI**: Analyze event descriptions, images
3. **Conversational AI**: Chat interface for recommendations
4. **Predictive Analytics**: Predict which events user will attend
5. **Social AI**: "Friends with similar taste also liked..."
