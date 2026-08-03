import { View } from "react-native";
import { Controller } from "react-hook-form";
import VerdictBlock from "@/components/shared/VerdictBlock";
import { makeStyles } from "@/theme";

const PresentationInput = ({ control }: { control: any }) => {
  const styles = useStyles();
  return (
    <Controller
      control={control}
      name="presentation"
      render={({ field: { onChange, value } }) => (
        <View style={styles.inputContainer}>
          <VerdictBlock
            // Paper, not purple: the composer's taste block is the screen's
            // one purple surface and two would fight.
            tone="paper"
            eyebrow="And the presentation?"
            value={value}
            onChange={onChange}
            placeholder={"Coupe, garnish, the whole arrival."}
            accessibilityLabel="Presentation rating"
            labels={[
              "Messy disaster",
              "Lacking effort",
              "Acceptably plain",
              "Elegantly simple",
              "Artistic masterpiece",
            ]}
          />
        </View>
      )}
    />
  );
};

const useStyles = makeStyles(() => ({
  inputContainer: {
    marginBottom: 10,
    width: "100%" as const,
  },
}));

export default PresentationInput;
