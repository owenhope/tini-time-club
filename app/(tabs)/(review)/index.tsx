import { Redirect } from "expo-router";
import { routes } from "@/utils/routes";

export default function ReviewTabPlaceholder() {
  return <Redirect href={routes.home()} />;
}
