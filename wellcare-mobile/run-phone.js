#!/usr/bin/env node
/**
 * run-phone.js
 * ---------------------------------------------------------------
 * Zero-config runner: works on ANY Android phone connected via USB
 * debugging. No device ID needs to be edited anywhere.
 *
 * What it does automatically:
 *   1. Finds the Android SDK (from env, or common install paths)
 *   2. Lists every attached device via `adb devices`
 *   3. Waits for you to accept the "Allow USB debugging?" dialog
 *   4. Picks the phone (asks you if there is more than one)
 *   5. Sets up `adb reverse` so the phone reaches your PC backend
 *   6. Runs `flutter run` on that phone
 *
 * Usage:
 *   npm run app:phone          <- use this
 *   node run-phone.js          <- same thing
 *   node run-phone.js -s <id>  <- skip the picker for a specific phone
 */

const { execFileSync, spawnSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Ports the backend may listen on (see backend/server.js and lib/theme.dart)
const PORTS = [5000, 5001];

// How long to wait for the user to tap "Allow" on the phone, in seconds.
const AUTH_WAIT_SECONDS = 60;

// ---------------------------------------------------------------------------
// Locate adb
// ---------------------------------------------------------------------------
function findAdb() {
  // 1. Explicit override
  if (process.env.ADB && fs.existsSync(process.env.ADB)) return process.env.ADB;

  // 2. Already on PATH
  const onPath = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['adb'], {
    encoding: 'utf8',
  });
  if (onPath.status === 0) {
    const first = onPath.stdout.split(/\r?\n/).find((l) => l.trim());
    if (first) return first.trim();
  }

  // 3. Common Android SDK locations
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(os.homedir(), 'AppData', 'Local', 'Android', 'sdk'), // Windows default
    path.join(os.homedir(), 'Library', 'Android', 'sdk'),          // macOS default
    path.join(os.homedir(), 'Android', 'Sdk'),                     // Linux default
  ]
    .filter(Boolean)
    .map((root) => path.join(root, 'platform-tools', 'adb' + (process.platform === 'win32' ? '.exe' : '')));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

// ---------------------------------------------------------------------------
// adb helpers
// ---------------------------------------------------------------------------
function makeAdb(adbPath) {
  const run = (args, opts = {}) =>
    execFileSync(adbPath, args, { encoding: 'utf8', stdio: opts.inherit ? 'inherit' : 'pipe' });

  /** Returns [{ id, state }] for every attached device. */
  const listDevices = () => {
    let out = '';
    try {
      out = run(['devices']);
    } catch {
      return [];
    }
    return out
      .split(/\r?\n/)
      .slice(1)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [id, state] = line.split(/\s+/);
        return { id, state };
      });
  };

  const reverse = (serial, port) =>
    run(['-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`]);

  const reverseList = (serial) => {
    try {
      return run(['-s', serial, 'reverse', '--list']);
    } catch {
      return '';
    }
  };

  return { run, listDevices, reverse, reverseList };
}

// ---------------------------------------------------------------------------
// Pick a device, waiting for authorization if needed
// ---------------------------------------------------------------------------
function chooseDevice(adb, forcedSerial) {
  const started = Date.now();
  let announcedWait = false;
  let lastSummary = '';

  while (true) {
    const devices = adb.listDevices();
    const summary = devices.map((d) => `${d.id}:${d.state}`).join(', ');

    if (summary !== lastSummary) {
      lastSummary = summary;
      const ready = devices.filter((d) => d.state === 'device');
      const pending = devices.filter((d) => d.state === 'unauthorized');
      const offline = devices.filter((d) => d.state === 'offline');

      if (pending.length) {
        console.log('\n  [!] Phone detected but NOT authorized yet:');
        pending.forEach((d) => console.log(`      ${d.id}`));
        console.log('\n  >>> UNLOCK YOUR PHONE and tap "Allow" on the');
        console.log('      "Allow USB debugging?" dialog.');
        console.log('      Tick "Always allow from this computer" first.\n');
        announcedWait = true;
      }
      if (offline.length) {
        console.log('\n  [!] Phone is OFFLINE — try unplugging and replugging the cable.');
        offline.forEach((d) => console.log(`      ${d.id}`));
        announcedWait = true;
      }
      if (ready.length && !pending.length && !offline.length) {
        if (forcedSerial) {
          const match = ready.find((d) => d.id === forcedSerial);
          if (!match) {
            console.error(`\n  [X] Requested device "${forcedSerial}" is not connected.`);
            console.error(`      Connected: ${ready.map((d) => d.id).join(', ') || '(none)'}\n`);
            process.exit(1);
          }
          return match.id;
        }
        if (ready.length === 1) return ready[0].id;

        console.log('\n  Multiple phones detected:\n');
        ready.forEach((d, i) => console.log(`    [${i + 1}] ${d.id}`));
        const answer = ask('  Choose a phone number: ');
        const index = parseInt(answer, 10) - 1;
        if (index >= 0 && index < ready.length) return ready[index].id;
        console.log('  Invalid choice, try again.');
        continue;
      }
    }

    if (!devices.length && !announcedWait) {
      console.log('\n  [.] Waiting for a phone to be connected via USB...');
      announcedWait = true;
    }

    if (Date.now() - started > AUTH_WAIT_SECONDS * 1000) {
      console.error(`\n  [X] Timed out after ${AUTH_WAIT_SECONDS}s waiting for an authorized phone.`);
      console.error('      Checklist:');
      console.error('        1. Developer options  ->  USB debugging = ON');
      console.error('        2. USB cable supports data (not charge-only)');
      console.error('        3. Tap "Allow" on the phone dialog');
      console.error('        4. Notification shade -> USB = "File Transfer (MTP)"');
      console.error('        5. If still stuck: Developer options ->');
      console.error('           "Revoke USB debugging authorizations", then replug.\n');
      process.exit(1);
    }

    sleep(1000);
  }
}

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------
const sleep = (ms) => {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      // Busy-wait in slices so we stay synchronous without extra deps.
      execFileSync(process.platform === 'win32' ? 'cmd' : 'sleep',
        process.platform === 'win32' ? ['/c', 'ping -n 2 127.0.0.1 >nul'] : ['0.5']);
    } catch { /* ignore */ }
  }
};

function ask(question) {
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  // Synchronous-ish prompt via a blocking read is not available in plain Node,
  // so we use a small trick: spawn a child that reads one line.
  const result = spawnSync(
    process.execPath,
    ['-e', `
      const rl = require('readline').createInterface({input:process.stdin,output:process.stdout});
      process.stdout.write(${JSON.stringify(question)});
      rl.once('line', (l) => { process.stdout.write('\\n'); process.exit(0); });
    `],
    { stdio: ['inherit', 'inherit', 'inherit'], encoding: 'utf8' }
  );
  rl.close();
  return '';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  const argv = process.argv.slice(2);
  const serialFlag = argv.indexOf('-s') !== -1 ? argv[argv.indexOf('-s') + 1] : null;

  const adbPath = findAdb();
  if (!adbPath) {
    console.error('\n  [X] Could not find "adb".');
    console.error('      Set ANDROID_HOME, or install Android platform-tools.');
    console.error('      Expected at: %LOCALAPPDATA%\\Android\\sdk\\platform-tools\\adb.exe\n');
    process.exit(1);
  }
  console.log(`\n  [.] Using adb: ${adbPath}`);

  const adb = makeAdb(adbPath);

  // Start the adb server so the authorization dialog pops up promptly.
  try {
    adb.run(['start-server'], { inherit: true });
  } catch { /* ignore */ }

  const serial = chooseDevice(adb, serialFlag);
  console.log(`\n  [OK] Using phone: ${serial}`);

  // Set up reverse port forwarding so the app reaches the PC backend.
  for (const port of PORTS) {
    try {
      adb.reverse(serial, port);
      console.log(`  [OK] adb reverse tcp:${port} -> tcp:${port}`);
    } catch (err) {
      console.log(`  [!] Could not set up reverse for port ${port}: ${String(err.message).split('\n')[0]}`);
    }
  }

  // Confirm forwarding is actually registered.
  const listed = adb.reverseList(serial).trim();
  if (listed) {
    console.log(`  [OK] Active forwards:\n${listed.split(/\r?\n/).map((l) => '        ' + l).join('\n')}`);
  }

  console.log('\n  [.] Launching Flutter app...\n');

  // Run flutter with the chosen device. Inherit stdio so hot reload works.
  const flutter = spawn('flutter', ['run', '-d', serial], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  flutter.on('exit', (code) => process.exit(code === null ? 1 : code));
}

main();
