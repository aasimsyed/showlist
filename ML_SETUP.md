# On-Device ML Recommendations Setup

## Installation

After adding the dependencies, you'll need to install them:

```bash
npm install
```

## TensorFlow.js Setup

TensorFlow.js for React Native requires some additional setup. The packages have been added to `package.json`:

- `@tensorflow/tfjs`: Core TensorFlow.js library
- `@tensorflow/tfjs-react-native`: React Native bindings

## How It Works

### 1. User Behavior Tracking
- Tracks favorite artists, venues, and time preferences
- Builds a user profile stored locally in AsyncStorage
- Updates automatically when favorites change

### 2. ML Model
- Simple neural network (32 → 16 → 1 neurons)
- Trained on-device using user's favorite history
- Predicts recommendation scores (0-1) for events

### 3. Recommendation Engine
- Combines rule-based scoring (60%) with ML predictions (40%)
- Generates explanations based on user patterns
- Only shows recommendations with confidence > 20%

### 4. Explanations
- "You've favorited [Artist] X times"
- "You've been to [Venue] X times"
- "Matches your [time] preference"
- "Strong match based on your patterns"

## Features

### ShowCard Integration
- Shows 🤖 badge on recommended events
- Tap badge to see detailed explanation
- Compact mode for inline display

### "For You" Section
- Horizontal scroll of top 5 recommendations
- Appears at top of home screen
- Only shows when user has 3+ favorites

## Privacy

- **100% On-Device**: All ML processing happens locally
- **No Data Sent**: Nothing leaves your device
- **User Control**: Can clear profile data anytime
- **Transparent**: Shows exactly why events are recommended

## Performance

- **Fast**: ML predictions take < 50ms
- **Cached**: Recommendations cached for 1 hour
- **Debounced**: Only recalculates when favorites change
- **Efficient**: Only processes top candidates

## Usage

The system works automatically once you have 3+ favorites:

1. Favorite some events
2. System learns your preferences
3. Recommendations appear with 🤖 badge
4. Tap badge to see why it's recommended

## Troubleshooting

### ML Model Not Initializing
- Check that TensorFlow.js is properly installed
- Ensure device has sufficient memory
- Model will fallback to simple scoring if ML fails

### No Recommendations Showing
- Need at least 3 favorites for recommendations
- Check that user profile is being saved
- Verify events are available

### Performance Issues
- Recommendations are debounced (500ms delay)
- Only top 20 candidates are scored
- ML predictions are cached

## Future Enhancements

- Fine-tune model based on user feedback
- Add more sophisticated feature engineering
- Implement collaborative filtering (if we had user data)
- Add time-based decay for old preferences
