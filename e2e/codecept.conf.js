/** @type {CodeceptJS.MainConfig} */
exports.config = {
    tests: './tests/*_test.js',
    output: './output',
    helpers: {
        Playwright: {
            browser: 'chromium',
            url: process.env.BASE_URL || 'http://localhost:3000',
            show: false,
            windowSize: '1920x1080',
            waitForNavigation: 'networkidle',
            waitForTimeout: 10000,
            getPageTimeout: 30000,
            trace: true,
            keepTraceForPassedTests: false,
            video: true,
            keepVideoForPassedTests: false,
        },
        REST: {
            endpoint: process.env.API_URL || 'http://localhost:5000',
            defaultHeaders: {
                'Content-Type': 'application/json',
            },
        },
        AuthHelper: {
            require: './helpers/auth_helper.js',
        },
        ApiHelper: {
            require: './helpers/api_helper.js',
        },
    },
    include: {
        I: './steps_file.js',
        loginPage: './pages/login.page.js',
        registerPage: './pages/register.page.js',
        notesPage: './pages/notes.page.js',
        tasksPage: './pages/tasks.page.js',
        profilePage: './pages/profile.page.js',
        adminPage: './pages/admin.page.js',
    },
    plugins: {
        allure: {
            enabled: true,
            outputDir: './output/allure-results',
        },
        screenshotOnFail: {
            enabled: true,
        },
        retryFailedStep: {
            enabled: true,
            retries: 3,
        },
        tryTo: {
            enabled: true,
        },
        pauseOnFail: {
            enabled: false,
        },
    },
    mocha: {
        reporterOptions: {
            mochaFile: './output/result.xml',
            reportDir: './output',
        },
    },
    name: 'NoteHub E2E Tests',
    bootstrap: null,
    teardown: null,
    hooks: [],
    gherkin: {},
};
