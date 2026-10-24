import { createTheme, type MantineColorsTuple } from '@mantine/core'

// Navy and teal on a light slate background. Teal 7 (#0F766E) carries white
// text at 5.5:1; navy 9 (#0F172A) is the header.
const navy: MantineColorsTuple = [
  '#F1F5F9',
  '#E2E8F0',
  '#CBD5E1',
  '#94A3B8',
  '#64748B',
  '#475569',
  '#334155',
  '#1E3A5F',
  '#1E293B',
  '#0F172A',
]

const brand: MantineColorsTuple = [
  '#F0FDFA',
  '#CCFBF1',
  '#99F6E4',
  '#5EEAD4',
  '#2DD4BF',
  '#14B8A6',
  '#0D9488',
  '#0F766E',
  '#115E59',
  '#134E4A',
]

export const theme = createTheme({
  colors: { navy, brand },
  primaryColor: 'brand',
  primaryShade: 7,
  fontFamily: "'Fira Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  headings: {
    fontFamily: "'Fira Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    fontWeight: '600',
  },
  defaultRadius: 'md',
  cursorType: 'pointer',
  focusRing: 'auto',
  components: {
    Card: { defaultProps: { withBorder: true, radius: 'md', padding: 'lg' } },
    Modal: { defaultProps: { radius: 'md', centered: true, overlayProps: { backgroundOpacity: 0.45, blur: 2 } } },
    Badge: { defaultProps: { radius: 'sm' } },
  },
})
