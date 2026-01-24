import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { RecommendationExplanation } from '../utils/explanationGenerator';

interface MLRecommendationBadgeProps {
  explanation: RecommendationExplanation;
  compact?: boolean;
}

export const MLRecommendationBadge: React.FC<MLRecommendationBadgeProps> = ({
  explanation,
  compact = false,
}) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const styles = createStyles(colors);

  if (!explanation || explanation.reasons.length === 0) return null;

  if (compact) {
    return (
      <View style={styles.compactBadge}>
        <Text style={styles.compactBadgeText}>🤖</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        style={styles.badge}
        activeOpacity={0.7}
        accessibilityLabel="ML recommendation"
        accessibilityHint="Double tap to see why this event is recommended"
      >
        <Text style={styles.badgeText}>🤖 For You</Text>
        {explanation.confidence > 0.7 && (
          <Text style={styles.confidenceText}>High match</Text>
        )}
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.expandedContent}>
          <Text style={styles.explanation}>{explanation.explanation}</Text>
          {explanation.reasons.length > 0 && (
            <View style={styles.reasoningContainer}>
              {explanation.reasons.map((reason, index) => (
                <Text key={index} style={styles.reason}>
                  • {reason}
                </Text>
              ))}
            </View>
          )}
          <TouchableOpacity
            onPress={() => setExpanded(false)}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    marginLeft: 8,
    position: 'relative',
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
    opacity: 0.9,
  },
  compactBadge: {
    backgroundColor: colors.pink,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  compactBadgeText: {
    fontSize: 12,
  },
  expandedContent: {
    position: 'absolute',
    top: 30,
    left: 0,
    right: 0,
    zIndex: 1000,
    marginTop: 4,
    padding: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxWidth: 300,
  },
  explanation: {
    fontSize: 12,
    color: colors.text,
    marginBottom: 8,
    fontWeight: '500',
  },
  reasoningContainer: {
    marginTop: 4,
  },
  reason: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
    lineHeight: 16,
  },
  closeButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.grayLight,
    borderRadius: 4,
    alignSelf: 'flex-end',
  },
  closeButtonText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '600',
  },
});
