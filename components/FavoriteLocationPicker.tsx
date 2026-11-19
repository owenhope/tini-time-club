import React from "react";
import { formatCityRegion, stripNameFromAddress } from "@/utils/helpers";
import type { FavoriteLocationValue } from "@/services/favoriteLocationSelection";
import { LocationVerifiedBadge, MartiniIcon } from "@/components/shared";
import PickerRow from "@/components/shared/PickerRow";
import { useTheme } from "@/theme";

interface FavoriteLocationPickerProps {
  value: FavoriteLocationValue | null;
  onPress: () => void;
}

const FavoriteLocationPicker: React.FC<FavoriteLocationPickerProps> = ({
  value,
  onPress,
}) => {
  const { colors } = useTheme();
  const subtitle =
    value?.address && value.name
      ? formatCityRegion(stripNameFromAddress(value.name, value.address))
      : null;

  return (
    <PickerRow
      title={value?.name ?? null}
      placeholder="Add favorite location"
      subtitle={subtitle}
      leading={
        value?.is_golden_glass ? (
          <MartiniIcon size={20} color={colors.awardGold} filled />
        ) : null
      }
      trailing={
        value?.is_location_verified ? <LocationVerifiedBadge compact /> : null
      }
      onPress={onPress}
      accessibilityLabel={
        value
          ? `Change favorite location, currently ${value.name}`
          : "Add favorite location"
      }
      accessibilityHint="Opens the location chooser"
    />
  );
};

export default FavoriteLocationPicker;
