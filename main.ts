import { BoardIds, BoardShim, DataFilter } from 'brainflow';
import * as fs from 'fs';
import * as path from 'path';

// Minimalistic script to record EEG band powers with filtering enabled for basic use in brainwave data recording.
// To run: 'npm start' or 'npx tsx main.ts'

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function calculateBandPowers(outputFileName: string = 'band_powers') {
    const boardId = BoardIds.SYNTHETIC_BOARD; // GANGLION_BOARD.. See board options https://brainflow.readthedocs.io/en/stable/UserAPI.html
    const board = new BoardShim(boardId, {});

    board.prepareSession();
    board.startStream();

    const samplingRate = BoardShim.getSamplingRate(boardId);
    const eegChannels = BoardShim.getEegChannels(boardId);

    console.log('Press "q" and hit Enter to stop...');

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', (key) => {
        if (key.toString() === 'q') {
            exit = true;
            process.stdin.setRawMode(false);
            process.stdin.pause();
        }
    });

    let exit = false;

    // Generate a timestamp and add it to the filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Format to 'YYYY-MM-DDTHH-MM-SS'
    const csvFilePath = path.join(__dirname, `${outputFileName}_${timestamp}.csv`);
    const csvStream = fs.createWriteStream(csvFilePath, { flags: 'a' });

    if (!fs.existsSync(csvFilePath)) {
        csvStream.write('Time,Delta,Theta,Alpha,Beta,Gamma\n');
    }

    while (!exit) {
        await sleep(1000);

        const data = board.getCurrentBoardData(samplingRate * 1);

        try {
            const [avgBandPowers] = DataFilter.getAvgBandPowers(
                data,
                eegChannels,
                samplingRate,
                true // Apply filters before calculating band powers
            );

            const currentTimestamp = new Date().toISOString();
            const bandPowerStr = `Delta: ${avgBandPowers[0].toFixed(3)} | Theta: ${avgBandPowers[1].toFixed(3)} | Alpha: ${avgBandPowers[2].toFixed(3)} | Beta: ${avgBandPowers[3].toFixed(3)} | Gamma: ${avgBandPowers[4].toFixed(3)}`;

            process.stdout.write(`\r${bandPowerStr}`);
            csvStream.write(`${currentTimestamp},${avgBandPowers.join(',')}\n`);
        } catch (error) {
            console.error('Error calculating average band powers:', error);
        }
    }

    board.stopStream();
    board.releaseSession();
    csvStream.end();
    console.log(`\nSession ended. Band powers saved to ${csvFilePath}.`);
}

// Run the function
calculateBandPowers();