import React from 'react';
import { ScrollView, TouchableOpacity, Text, View } from 'react-native';

const CATEGORIES = [
  'All 🍔',
  'Burgers 🍔',
  'Pizza 🍕',
  'Biryani 🍛',
  'Pakistani 🍲',
  'Chinese 🥢',
  'Desserts 🍰',
];

export default function CuisineCategories({ selectedCategory = 'All 🍔', onSelectCategory }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-2">
      {CATEGORIES.map((cat) => {
        const isSelected = selectedCategory === cat;
        return (
          <TouchableOpacity
            key={cat}
            onPress={() => onSelectCategory && onSelectCategory(cat)}
            activeOpacity={0.75}
            className={`px-4 py-2 mr-2 rounded-full border ${
              isSelected
                ? 'bg-[#D70F64] border-[#D70F64]'
                : 'bg-white border-gray-200'
            }`}
          >
            <Text
              className={`text-xs ${
                isSelected ? 'text-white font-bold' : 'text-[#1F1F1F]'
              }`}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
