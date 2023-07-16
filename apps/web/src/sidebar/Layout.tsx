import { useState } from "react";
import {
  createStyles,
  Container,
  Navbar,
  UnstyledButton,
  Tooltip,
  Title,
  rem,
} from "@mantine/core";
import {
  IconRecycle,
  IconFiles,
  IconDeviceDesktopAnalytics,
  IconClipboardData,
  IconVectorTriangle,
  IconSettings,
  IconRefreshAlert,
} from "@tabler/icons-react";
import { Circular } from "./Circular";
import { GraphConfiguration } from "./GraphConfiguration";
import { Summary } from "./Summary";
import { FileExplorer } from "./FileExplorer";
import { InteractivePlayground } from "./InteractivePlayground";

const useStyles = createStyles((theme) => ({
  wrapper: {
    display: "flex",
  },

  aside: {
    flex: `0 0 ${rem(60)}`,
    backgroundColor:
      theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    borderRight: `${rem(1)} solid ${
      theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.colors.gray[3]
    }`,
    paddingTop: theme.spacing.md,
  },

  main: {
    flex: 1,
    backgroundColor:
      theme.colorScheme === "dark"
        ? theme.colors.dark[6]
        : theme.colors.gray[0],
  },

  mainLink: {
    width: rem(44),
    height: rem(44),
    borderRadius: theme.radius.md,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[0]
        : theme.colors.gray[7],

    "&:hover": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.colors.dark[5]
          : theme.colors.gray[0],
    },
  },

  mainLinkActive: {
    "&, &:hover": {
      backgroundColor: theme.fn.variant({
        variant: "light",
        color: theme.primaryColor,
      }).background,
      color: theme.fn.variant({ variant: "light", color: theme.primaryColor })
        .color,
    },
  },

  title: {
    boxSizing: "border-box",
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
    marginBottom: theme.spacing.xl,
    backgroundColor:
      theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
    padding: theme.spacing.md,
    paddingTop: rem(18),
    height: rem(60),
    borderBottom: `${rem(1)} solid ${
      theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.colors.gray[3]
    }`,
  },

  logo: {
    boxSizing: "border-box",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    height: rem(60),
    paddingTop: theme.spacing.md,
    borderBottom: `${rem(1)} solid ${
      theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.colors.gray[3]
    }`,
    marginBottom: theme.spacing.xl,
  },

  link: {
    boxSizing: "border-box",
    display: "block",
    textDecoration: "none",
    borderTopRightRadius: theme.radius.md,
    borderBottomRightRadius: theme.radius.md,
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[0]
        : theme.colors.gray[7],
    padding: `0 ${theme.spacing.md}`,
    fontSize: theme.fontSizes.sm,
    marginRight: theme.spacing.md,
    fontWeight: 500,
    height: rem(44),
    lineHeight: rem(44),

    "&:hover": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.colors.dark[5]
          : theme.colors.gray[1],
      color: theme.colorScheme === "dark" ? theme.white : theme.black,
    },
  },

  linkActive: {
    "&, &:hover": {
      borderLeftColor: theme.fn.variant({
        variant: "filled",
        color: theme.primaryColor,
      }).background,
      backgroundColor: theme.fn.variant({
        variant: "filled",
        color: theme.primaryColor,
      }).background,
      color: theme.white,
    },
  },
}));

const menus = [
  { icon: IconClipboardData, label: "Summary", key: "summary" },
  { icon: IconFiles, label: "File Explorer", key: "file_explorer" },
  {
    icon: IconDeviceDesktopAnalytics,
    label: "Interactive Playground",
    key: "interactive_playground",
  },
  { icon: IconRefreshAlert, label: "Circular", key: "circular" },
  {
    icon: IconVectorTriangle,
    label: "Graph Configuration",
    key: "graph_configuration",
  },
  { icon: IconSettings, label: "User Settings", key: "settings" },
] as const;

type MenuKeys = (typeof menus)[number]["key"];

export function DoubleNavbar() {
  const { classes, cx } = useStyles();
  const [active, setActive] = useState<MenuKeys>("summary");

  const mainMenus = menus.map((link) => (
    <Tooltip
      label={link.label}
      position="right"
      withArrow
      transitionProps={{ duration: 0.25 }}
      key={link.key}
    >
      <UnstyledButton
        onClick={() => setActive(link.key)}
        className={cx(classes.mainLink, {
          [classes.mainLinkActive]: link.key === active,
        })}
      >
        <link.icon size="1.4rem" stroke={1.5} />
      </UnstyledButton>
    </Tooltip>
  ));

  const selectComponent = (active: MenuKeys) => {
    switch (active) {
      case "circular":
        return <Circular key="apanayo" />;
      case "graph_configuration":
        return <GraphConfiguration />;
      case "summary":
        return <Summary />;
      case "file_explorer":
        return <FileExplorer />;
      case "interactive_playground":
        return <InteractivePlayground />;
      default:
        return <Summary />;
    }
  };

  return (
    <Navbar width={{ sm: 300 }}>
      <Navbar.Section grow className={classes.wrapper}>
        <div className={classes.aside}>{mainMenus}</div>
        <div className={classes.main}>{selectComponent(active)}</div>
      </Navbar.Section>
    </Navbar>
  );
}
