# ML Model Learning Schedule

## When Learning Occurs

### 1. **Model Initialization** (App Launch)
- ✅ Model architecture is created
- ✅ Neural network is ready
- ❌ **Not trained yet** - uses random weights initially

### 2. **Automatic Training** (When Favorites Change)
Training happens automatically when:
- ✅ You have **10+ favorites** (minimum for meaningful training)
- ✅ Favorites count **increased by 3+** (significant change)
- ✅ Training is **debounced by 2 seconds** (avoids too frequent training)

### 3. **Training Process**
```
1. User favorites 3+ new events
   ↓
2. Wait 2 seconds (debounce)
   ↓
3. Check: Do we have 10+ favorites?
   ↓
4. Build training data from all favorites
   ↓
5. Train neural network (10 epochs)
   ↓
6. Model learns your preferences
   ↓
7. Future predictions are more accurate
```

## Training Frequency

| Scenario | Training Occurs? |
|----------|------------------|
| App launch | ❌ No (model created but untrained) |
| First 9 favorites | ❌ No (not enough data) |
| 10th favorite added | ✅ Yes (first training) |
| Every 3+ new favorites | ✅ Yes (incremental learning) |
| Removing favorites | ✅ Yes (if still 10+ remaining) |

## What Gets Learned

The model learns:
- **Which artists** you prefer (from favorites)
- **Which venues** you prefer (from favorites)
- **Time patterns** (when you favorite events)
- **Feature combinations** (complex patterns)

## Training Details

- **Epochs**: 10 (iterations through training data)
- **Batch Size**: Up to 32 (processes in batches)
- **Validation Split**: 20% (tests accuracy)
- **Time**: ~1-3 seconds (depending on data size)

## Example Timeline

```
Day 1:
- Favorite 5 events → No training (need 10+)
- Model uses random weights

Day 2:
- Favorite 5 more events (total: 10)
- ✅ Training triggered!
- Model learns from all 10 favorites
- Predictions improve

Day 3:
- Favorite 3 more events (total: 13)
- ✅ Training triggered again!
- Model learns from all 13 favorites
- Predictions improve further

Week 2:
- Have 25 favorites
- Every 3 new favorites → Model retrains
- Continuously improving accuracy
```

## Performance Impact

- **Training Time**: 1-3 seconds (runs in background)
- **Frequency**: Only when you add 3+ favorites
- **UI Impact**: None (non-blocking)
- **Battery**: Minimal (CPU backend, small model)

## Manual Training (Optional)

You can also trigger training manually:

```typescript
import { mlService } from './src/services/mlService';
import { getUserProfile } from './src/utils/userBehaviorTracker';
import { convertProfileToFeatures, convertShowToFeatures } from './src/utils/mlRecommendationEngine';

const profile = await getUserProfile();
const userFeatures = convertProfileToFeatures(profile);
const trainingData = favorites.map(fav => ({
  userFeatures,
  eventFeatures: convertShowToFeatures(fav),
  label: 1,
}));

await mlService.trainModel(trainingData);
```

## Current Status

✅ **Automatic training is now enabled!**

The model will:
- Train when you reach 10+ favorites
- Retrain every time you add 3+ more favorites
- Continuously improve recommendations
- Learn your unique preferences

## Monitoring

Check console logs:
- `🧠 Training model with X favorites...` = Training started
- `✅ Model training complete` = Training finished
- `Skipping training: insufficient data` = Need more favorites
