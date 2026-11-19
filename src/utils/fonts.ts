export interface FontOption {
  name: string;
  category: 'Sans-Serif' | 'Serif' | 'Display' | 'Script' | 'Monospace';
  fallback: string;
}

export const POPULAR_FONTS: FontOption[] = [
  // Sans-Serif
  { name: 'Montserrat', category: 'Sans-Serif', fallback: 'sans-serif' },
  { name: 'Roboto', category: 'Sans-Serif', fallback: 'sans-serif' },
  { name: 'Open Sans', category: 'Sans-Serif', fallback: 'sans-serif' },
  { name: 'Poppins', category: 'Sans-Serif', fallback: 'sans-serif' },
  { name: 'Inter', category: 'Sans-Serif', fallback: 'sans-serif' },
  { name: 'Arial', category: 'Sans-Serif', fallback: 'sans-serif' },
  { name: 'Verdana', category: 'Sans-Serif', fallback: 'sans-serif' },
  { name: 'Trebuchet MS', category: 'Sans-Serif', fallback: 'sans-serif' },
  { name: 'Helvetica', category: 'Sans-Serif', fallback: 'sans-serif' },
  // Serif
  { name: 'Playfair Display', category: 'Serif', fallback: 'serif' },
  { name: 'Times New Roman', category: 'Serif', fallback: 'serif' },
  { name: 'Georgia', category: 'Serif', fallback: 'serif' },
  { name: 'Garamond', category: 'Serif', fallback: 'serif' },
  // Display & Script
  { name: 'Bebas Neue', category: 'Display', fallback: 'sans-serif' },
  { name: 'Oswald', category: 'Display', fallback: 'sans-serif' },
  { name: 'Impact', category: 'Display', fallback: 'sans-serif' },
  { name: 'Pacifico', category: 'Script', fallback: 'cursive' },
  { name: 'Lobster', category: 'Script', fallback: 'cursive' },
  { name: 'Comic Sans MS', category: 'Display', fallback: 'cursive' },
  // Monospace
  { name: 'Courier New', category: 'Monospace', fallback: 'monospace' },
  { name: 'Fira Code', category: 'Monospace', fallback: 'monospace' },
];

export const FONT_SIZES = [
  6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72, 84, 96, 120, 144,
];

export const FONT_WEIGHTS = [
  { label: 'Thin (100)', value: '100' },
  { label: 'Light (300)', value: '300' },
  { label: 'Regular (400)', value: 'normal' },
  { label: 'Medium (500)', value: '500' },
  { label: 'Semi-Bold (600)', value: '600' },
  { label: 'Bold (700)', value: 'bold' },
  { label: 'Extra-Bold (800)', value: '800' },
  { label: 'Black (900)', value: '900' },
];
