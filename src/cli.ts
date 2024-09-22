import {Command} from 'commander';
import {exec} from "child_process" //Import to run shell commands
import {promisify} from "util" //Use promisfy to use async/wait
import logger from './logger'; //Import the logger
import fs from 'fs'; //Import the file system module
import { log } from 'console';
import { RunProject } from './netScore';

const execAsync = promisify(exec);

const program = new Command();

program
    .name("run")

program
    .command('install')
    .description('Install dependencies')
    .action(async () => {
        logger.info("Installing dependencies...");
        const modules = ['jest', 'axios', 'dotenv', 'commander', 'winston']; //List of modules to install
        const modulesString = modules.join(' '); //Convert the list to a string
        try {
            const {stdout, stderr} = await execAsync('npm install ' + modulesString); //Run npm install

            logger.info(`${modules.length} dependencies installed successfully`);

            if (stderr) { logger.debug(`Error installing dependencies: ${stderr}`); } //Output any errors
            
            logger.debug("RC: 0");
            logger.close();
            process.exit(0);  // Exit after logs are flushed
        }
        catch (error: any) { //Error installing dependencies
            logger.info("Error installing dependencies");
            if(error.stderr) { logger.debug(`Errors:\n${error.stderr}`); } //Output any errors
            if(error.stdout) { logger.debug(`Output:\n${error.stdout}`); } //Output the results from npm install
            
            logger.debug("RC: 1");
            logger.close();
            process.exit(1);  // Exit after logs are flushed
        }
    });

program
    .command('test')
    .description("Run test cases")
    .action (async () => {
        logger.info("Running test cases");
        //Run test cases through Jest
        try {
            // Run jest with coverage
            const { stdout, stderr} = await execAsync('npx jest --coverage --silent --noStackTrace'); // Add --silent to keep the output clean
            logger.debug(`Test Results:\n${stdout}`);
            logger.debug(`Test Errors:\n${stderr}`);
            // Regex to extract passed test count, total test count, and line coverage percentage
            const testResults = stderr.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/);
            const coverageResults = stdout.match(/All files\s+\|\s+[\d.]+\s+\|\s+[\d.]+\s+\|\s+[\d.]+\s+\|\s+([\d.]+)/);

            const passed = testResults ? parseInt(testResults[1], 10) : 0;
            const total = testResults ? parseInt(testResults[2], 10) : 0;
            const coverage = coverageResults ? parseFloat(coverageResults[1]) : 0;

            logger.info(`${passed}/${total} test cases passed. ${coverage}% line coverage achieved.`);

            // Exit with code 0 for success or non-zero for failure
            logger.debug("RC: 0");
            logger.close();
            process.exit(0);  // Success
        } catch (error : any) {
            logger.info("Error running test cases");

            const testResults = error.stderr.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
            const coverageResults = error.stdout.match(/All files\s+\|\s+[\d.]+\s+\|\s+[\d.]+\s+\|\s+[\d.]+\s+\|\s+([\d.]+)/);
            const passed = testResults ? parseInt(testResults[2], 10) : 0;
            const total = testResults ? parseInt(testResults[3], 10) : 0;
            const coverage = coverageResults ? parseFloat(coverageResults[1]) : 0;
            
            logger.debug(`Test Errors:\n${error.stderr}`);
            logger.debug(`Test Results:\n${error.stdout}`);
            logger.info(`${passed}/${total} test cases passed. ${coverage}% line coverage achieved.`);
            
            logger.debug("RC: 1");
            logger.close();
            process.exit(1);  // Non-zero exit code on error
        }
    });

program
    .argument("<urlFile>", "Path to the URL file")
    .description("Process a url file")
    .action(async (urlFile) => {
        const result = await checkEnvVariables(); //Check if the environment variables are set
        if (result === 1) { //Exit if the environment variables are not set
            logger.debug("RC: 1");
            logger.close();
            process.exit(1);
        }

        logger.debug(`Processing URLS from file: ${urlFile}`);
        // Process the file using the URL handling function

        if (!fs.existsSync(urlFile)) { //Check if the file exists
            logger.info("File does not exist");
            logger.debug("RC: 1");
            logger.close();
            process.exit(1);
        }

        //Read the file and process URLs
        try {
            const fileContents = fs.readFileSync(urlFile, 'utf-8'); //Read the file
            
            await RunProject(urlFile); //Run the project

            logger.debug("RC: 0");
            logger.close();
            process.exit(0);

        } catch (error: any) { //Error reading the file
            logger.info("Error reading the file");
            logger.debug(`Error: ${error.message}`);

            logger.debug("RC: 1");
            logger.close();
            process.exit(1);
        }
    });

//Handle unknown commands
// program.on('command:*', () => {
//     logger.info('error: unknown command');
//     logger.on('finish', () => {
//         logger.debug("RC: 1");
//         process.exit(1);
//     });
// });

program.parse(process.argv)

async function checkEnvVariables() {
    if (!process.env.LOG_FILE) {
        logger.info("Environment variable LOG_FILE is not defined");
        return 1;
    }

    if (!process.env.GITHUB_TOKEN) {
        logger.info("Environment variable GITHUB_TOKEN is not defined");
        return 1;
    }

    logger.debug("Environment variables are set");
    return 0;
}