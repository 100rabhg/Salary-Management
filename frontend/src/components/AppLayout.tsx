import { Avatar, Box, Container, Group, Menu, Text, UnstyledButton } from '@mantine/core'
import {
  IconChartBar,
  IconChartLine,
  IconChevronDown,
  IconInfoCircle,
  IconLayoutDashboard,
  IconUsers,
} from '@tabler/icons-react'
import { NavLink, Outlet } from 'react-router'
import { config } from '../config'
import { initials } from '../lib/format'
import classes from './AppLayout.module.css'

export function AppLayout() {
  return (
    <>
      <a href="#main" className={classes.skipLink}>
        Skip to main content
      </a>
      <Box component="header" className={classes.header}>
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Group gap="xl" wrap="nowrap">
              <Group gap={8} wrap="nowrap">
                <Box className={classes.logo} aria-hidden>
                  <IconChartLine size={18} stroke={2.25} />
                </Box>
                <Text fw={600} c="white" size="lg" visibleFrom="xs">
                  {config.appName}
                </Text>
              </Group>
              <nav aria-label="Main">
                <Group gap={4} wrap="nowrap">
                  <NavLink to="/" end className={classes.navLink}>
                    <IconLayoutDashboard size={18} aria-hidden />
                    <span className={classes.navText}>Dashboard</span>
                  </NavLink>
                  <NavLink to="/employees" className={classes.navLink}>
                    <IconUsers size={18} aria-hidden />
                    <span className={classes.navText}>Employees</span>
                  </NavLink>
                  <NavLink to="/insights" className={classes.navLink}>
                    <IconChartBar size={18} aria-hidden />
                    <span className={classes.navText}>Insights</span>
                  </NavLink>
                </Group>
              </nav>
            </Group>
            <HrProfileMenu />
          </Group>
        </Container>
      </Box>
      <Container size="xl" component="main" id="main" py="xl" px="md">
        <Outlet />
      </Container>
    </>
  )
}

// Authentication is out of scope, so this shows a fixed demo HR user.
function HrProfileMenu() {
  const { name, role } = config.hrUser
  return (
    <Menu position="bottom-end" width={240} shadow="md">
      <Menu.Target>
        <UnstyledButton className={classes.profile} aria-label={`Account: ${name}, ${role}`}>
          <Group gap="sm" wrap="nowrap">
            <Avatar color="brand" variant="filled" radius="xl" size={34}>
              {initials(name)}
            </Avatar>
            <Box visibleFrom="sm">
              <Text size="sm" fw={500} c="white" lh={1.2}>
                {name}
              </Text>
              <Text size="xs" c="navy.2" lh={1.2}>
                {role}
              </Text>
            </Box>
            <IconChevronDown size={16} color="var(--mantine-color-navy-2)" aria-hidden />
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Demo account</Menu.Label>
        <Menu.Item leftSection={<IconInfoCircle size={16} />} disabled>
          <Text size="xs" c="dimmed">
            Sign-in is not part of this demo, so every visitor uses this HR profile.
          </Text>
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}
