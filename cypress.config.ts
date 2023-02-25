import { defineConfig } from 'cypress'
import setupNodeEvents from './cypress/plugins/index'

export default defineConfig({
  projectId: "vkcycj",
  fixturesFolder: false,
  scrollBehavior: "center",
  viewportHeight: 900,
  viewportWidth: 1440,
  e2e: {
    supportFile: false,
    specPattern: "cypress/integration/*spec.ts",
    baseUrl: 'http://localhost:3000',
    setupNodeEvents,
  },
})
