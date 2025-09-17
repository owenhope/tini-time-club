# Shared Components

## Button Component

A reusable button component with customizable size, color, and style properties.

### Usage

```tsx
import { Button } from '@/components/shared';

// Basic usage
<Button title="Click me" onPress={() => console.log('pressed')} />

// With different variants
<Button title="Primary" variant="primary" onPress={handlePress} />
<Button title="Secondary" variant="secondary" onPress={handlePress} />
<Button title="Outline" variant="outline" onPress={handlePress} />
<Button title="Ghost" variant="ghost" onPress={handlePress} />
<Button title="Danger" variant="danger" onPress={handlePress} />

// With different sizes
<Button title="Small" size="small" onPress={handlePress} />
<Button title="Medium" size="medium" onPress={handlePress} />
<Button title="Large" size="large" onPress={handlePress} />
<Button title="Extra Large" size="xlarge" onPress={handlePress} />

// With icons
<Button
  title="Save"
  icon="save"
  iconPosition="left"
  onPress={handleSave}
/>

// With loading state
<Button
  title="Loading..."
  loading={true}
  onPress={handlePress}
/>

// Full width button
<Button
  title="Full Width"
  fullWidth
  onPress={handlePress}
/>

// Disabled button
<Button
  title="Disabled"
  disabled
  onPress={handlePress}
/>
```

### Props

| Prop            | Type                                                           | Default     | Description                                      |
| --------------- | -------------------------------------------------------------- | ----------- | ------------------------------------------------ |
| `title`         | `string`                                                       | -           | Button text (required)                           |
| `onPress`       | `() => void`                                                   | -           | Press handler (required)                         |
| `disabled`      | `boolean`                                                      | `false`     | Whether button is disabled                       |
| `loading`       | `boolean`                                                      | `false`     | Whether button is in loading state               |
| `size`          | `'small' \| 'medium' \| 'large' \| 'xlarge'`                   | `'medium'`  | Button size                                      |
| `variant`       | `'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'danger'` | `'primary'` | Button style variant                             |
| `icon`          | `keyof typeof Ionicons.glyphMap`                               | -           | Ionicons icon name                               |
| `iconPosition`  | `'left' \| 'right' \| 'none'`                                  | `'none'`    | Icon position relative to text                   |
| `iconColor`     | `string`                                                       | -           | Custom icon color (defaults to text color)       |
| `iconSize`      | `number`                                                       | -           | Custom icon size (defaults based on button size) |
| `fullWidth`     | `boolean`                                                      | `false`     | Whether button takes full width                  |
| `style`         | `ViewStyle`                                                    | -           | Additional button styles                         |
| `textStyle`     | `TextStyle`                                                    | -           | Additional text styles                           |
| `activeOpacity` | `number`                                                       | `0.7`       | TouchableOpacity active opacity                  |

### Variants

- **Primary**: Purple background (`#B6A3E2`) with white text
- **Secondary**: Gray background (`#6B7280`) with white text
- **Outline**: Transparent background with purple border and text
- **Ghost**: Transparent background with purple text
- **Danger**: Red background (`#EF4444`) with white text

### Sizes

- **Small**: 36px height, 14px text, 16px icon
- **Medium**: 48px height, 16px text, 18px icon
- **Large**: 56px height, 18px text, 20px icon
- **Extra Large**: 64px height, 20px text, 22px icon

## Input Component

A reusable input component with customizable size, variant, and style properties.

### Usage

```tsx
import { Input } from '@/components/shared';

// Basic usage
<Input
  placeholder="Enter text"
  value={value}
  onChangeText={setValue}
/>

// With different variants
<Input
  placeholder="Default"
  variant="default"
  value={value}
  onChangeText={setValue}
/>
<Input
  placeholder="Outlined"
  variant="outlined"
  value={value}
  onChangeText={setValue}
/>
<Input
  placeholder="Filled"
  variant="filled"
  value={value}
  onChangeText={setValue}
/>
<Input
  placeholder="Transparent"
  variant="transparent"
  value={value}
  onChangeText={setValue}
/>

// With different sizes
<Input
  placeholder="Small"
  size="small"
  value={value}
  onChangeText={setValue}
/>
<Input
  placeholder="Medium"
  size="medium"
  value={value}
  onChangeText={setValue}
/>
<Input
  placeholder="Large"
  size="large"
  value={value}
  onChangeText={setValue}
/>

// With different types
<Input
  placeholder="Email"
  type="email"
  value={email}
  onChangeText={setEmail}
/>
<Input
  placeholder="Password"
  type="password"
  showPasswordToggle
  value={password}
  onChangeText={setPassword}
/>
<Input
  placeholder="Number"
  type="number"
  value={number}
  onChangeText={setNumber}
/>
<Input
  placeholder="Multiline text"
  type="multiline"
  numberOfLines={4}
  value={text}
  onChangeText={setText}
/>

// With icons
<Input
  placeholder="Search"
  leftIcon="search"
  value={search}
  onChangeText={setSearch}
/>
<Input
  placeholder="With right icon"
  rightIcon="close"
  onRightIconPress={clearInput}
  value={value}
  onChangeText={setValue}
/>

// With label and error
<Input
  label="Email Address"
  placeholder="Enter your email"
  value={email}
  onChangeText={setEmail}
  error="Please enter a valid email"
/>

// Disabled input
<Input
  placeholder="Disabled"
  disabled
  value={value}
  onChangeText={setValue}
/>
```

### Props

| Prop                 | Type                                                         | Default     | Description                                |
| -------------------- | ------------------------------------------------------------ | ----------- | ------------------------------------------ |
| `placeholder`        | `string`                                                     | -           | Placeholder text                           |
| `value`              | `string`                                                     | -           | Input value (required)                     |
| `onChangeText`       | `(text: string) => void`                                     | -           | Text change handler (required)             |
| `label`              | `string`                                                     | -           | Label text above input                     |
| `error`              | `string`                                                     | -           | Error message below input                  |
| `disabled`           | `boolean`                                                    | `false`     | Whether input is disabled                  |
| `size`               | `'small' \| 'medium' \| 'large'`                             | `'medium'`  | Input size                                 |
| `variant`            | `'default' \| 'outlined' \| 'filled' \| 'transparent'`       | `'default'` | Input style variant                        |
| `type`               | `'text' \| 'email' \| 'password' \| 'number' \| 'multiline'` | `'text'`    | Input type                                 |
| `multiline`          | `boolean`                                                    | `false`     | Whether input is multiline                 |
| `numberOfLines`      | `number`                                                     | `1`         | Number of lines for multiline input        |
| `maxLength`          | `number`                                                     | -           | Maximum character length                   |
| `autoCapitalize`     | `'none' \| 'sentences' \| 'words' \| 'characters'`           | `'none'`    | Auto capitalization setting                |
| `autoCorrect`        | `boolean`                                                    | `false`     | Whether to enable auto correction          |
| `keyboardType`       | `'default' \| 'email-address' \| 'numeric' \| 'phone-pad'`   | `'default'` | Keyboard type                              |
| `secureTextEntry`    | `boolean`                                                    | `false`     | Whether text should be hidden              |
| `showPasswordToggle` | `boolean`                                                    | `false`     | Whether to show password visibility toggle |
| `leftIcon`           | `keyof typeof Ionicons.glyphMap`                             | -           | Left icon name                             |
| `rightIcon`          | `keyof typeof Ionicons.glyphMap`                             | -           | Right icon name                            |
| `onRightIconPress`   | `() => void`                                                 | -           | Right icon press handler                   |
| `style`              | `ViewStyle`                                                  | -           | Additional container styles                |
| `inputStyle`         | `TextStyle`                                                  | -           | Additional input text styles               |
| `containerStyle`     | `ViewStyle`                                                  | -           | Additional container styles                |
| `testID`             | `string`                                                     | -           | Test identifier                            |

### Variants

- **Default**: Light gray background (`#fafafa`) with gray border
- **Outlined**: Transparent background with purple border (`#B6A3E2`)
- **Filled**: Light gray background (`#F3F4F6`) with no border
- **Transparent**: Semi-transparent background with white text (for overlays)

### Sizes

- **Small**: 36px height, 14px text
- **Medium**: 48px height, 16px text
- **Large**: 56px height, 18px text

### Types

- **Text**: Standard text input
- **Email**: Email input with email keyboard
- **Password**: Password input with optional visibility toggle
- **Number**: Numeric input with numeric keyboard
- **Multiline**: Multi-line text input for longer text
