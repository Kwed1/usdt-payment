import { useTranslation } from "react-i18next";

export const useTranslatedTitle = () => {
  const { t } = useTranslation();

  const getTranslatedTitle = (title: string) => {
    if (title.startsWith("Чемпионшип")) {
      return title.replace("Чемпионшип", t("championship"));
    }
    return title;
  };

  return { getTranslatedTitle };
};