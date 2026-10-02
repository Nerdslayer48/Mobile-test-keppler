import graphicDesignIcon from "../icons/customize-computer.png";
import developmentIcon from "../icons/display-code.png";
import uiDesignIcon from "../icons/layout-fluid.png";
import socialMediaIcon from "../icons/subscription-user.png";
import videoEditingIcon from "../icons/film.png";
import motionGraphicsIcon from "../icons/motion-graphic.png";
import threeDDesignIcon from "../icons/model-cube-arrows.png";
import photographyIcon from "../icons/camera-viewfinder.png";
import audioDesignIcon from "../icons/headphones-rhythm.png";
import aiAutomationIcon from "../icons/microchip-ai.png";
import marketingIcon from "../icons/megaphone.png";
import productDesignIcon from "../icons/box-extendable.png";
import dataVisualizationIcon from "../icons/chart-histogram.png";
import architectureIcon from "../icons/blueprint-house.png";
import gameDevelopmentIcon from "../icons/gamepad.png";
import fallbackIcon from "../icons/box-open.png";

const categoryIcons = new Map<string, string>([
  ["graphic design/illustration", graphicDesignIcon],
  ["web/software development", developmentIcon],
  ["ui/ux design", uiDesignIcon],
  ["social media management", socialMediaIcon],
  ["video editing/vfx", videoEditingIcon],
  ["motion graphics/animation", motionGraphicsIcon],
  ["3d design", threeDDesignIcon],
  ["photography", photographyIcon],
  ["audio & sound design", audioDesignIcon],
  ["ai automation", aiAutomationIcon],
  ["digital marketing", marketingIcon],
  ["product design", productDesignIcon],
  ["data visualization", dataVisualizationIcon],
  ["architectural visualization", architectureIcon],
  ["game development", gameDevelopmentIcon],
]);

export function getProjectCategoryIcon(category?: string) {
  return categoryIcons.get(category?.trim().toLowerCase() ?? "") ?? fallbackIcon;
}
