#!/usr/bin/env node

const nodegit = require("nodegit");
const fs = require("fs");
const path = require("path");
const { FileStatusBits } = require("./constants");
const toml = require("toml");
const shell = require("shelljs");
const colors = require("colors");
const args = require("args");

const main = async (configOptionPath) => {
	/*
		Read config file
	*/
	const configFilePath = path.resolve(
		configOptionPath
			? configOptionPath
			: `${process.cwd()}/amet.config.toml`
	);
	if (fs.existsSync(configFilePath)) {
		try {
			config = toml.parse(fs.readFileSync(configFilePath, "utf-8"));
			console.log(configFilePath);
			if (config.command == undefined) {
				// no command specified
				shell.echo("No command specified in config file.\n".red);
				process.exit(1);
			}

			if (!Array.isArray(config.match)) {
				// no command specified
				shell.echo.log(
					"Match does not have correct structure or is not specified.\n"
						.red
				);
				process.exit(1);
			}

			if (
				!Array.isArray(config.mode) ||
				(Array.isArray(config.mode) && config.mode.length == 0)
			) {
				// no command specified
				shell.echo(
					"Mode does not have correct structure or is not specified."
						.red
				);
				process.exit(1);
			}

			if (!Array.isArray(config.postfix)) {
				// no command specified
				shell.echo(
					"Postfix pattern does not have correct structure or is not specified..\n"
						.red
				);
				process.exit(1);
			}

			if (config.source == "git") {
				const toBeTestedFiles = await handleWithGit(config);
				runTests(toBeTestedFiles);
			}
		} catch (err) {
			shell.echo(err);
		}
	}
};

const handleWithGit = async (config) => {
	try {
		let toBeTestedFiles = [];
		let simpleFilePaths = [];

		let repo = await nodegit.Repository.open(".");

		let statusFiles = await repo.getStatus();

		if (config.mode.indexOf("commit") != -1) {
			/* 	No file has been changed.
				This happens when repository is beeing tested on CI/CD environment or user tries to run amet after a commit on local.
				So there are two options, if amet logs are enabled we will check logs and run test according
				to that log file and if not we will check last commit of current branch and test files
				according to those files and amet config file.
			*/

			let currentBranch = await repo.getCurrentBranch();

			let lastCommit = await repo.getBranchCommit(
				currentBranch.shorthand()
			);
			shell.echo(
				`Adding latest commit files. Commit name: ${lastCommit.message()}`
			);
			lastCommit.getDiff().then((difference) => {
				difference.forEach(async (d) => {
					try {
						const res = await d.patches();
						res.forEach((p) => {
							const path = p.newFile().path();
							config.match.forEach((rText) => {
								let regex = new RegExp(rText);
								let testResult = regex.test(path);
								if (testResult) toBeTestedFiles.push(path);
							});
						});
					} catch (err) {
						shell.echo(err);
					}
				});
			});
		}

		if (config.mode.indexOf("change") != -1) {
			/*
				This happens when user is testing changed files before commit.
			*/
			let newAndModifiedFiles = statusFiles.filter(
				(sf) =>
					[...FileStatusBits.new, ...FileStatusBits.modified].indexOf(
						sf.statusBit()
					) !== -1
			);

			newAndModifiedFiles.forEach((sf) => {
				config.match.forEach((rText) => {
					let regex = new RegExp(rText);
					let testResult = regex.test(sf.path());
					if (testResult) toBeTestedFiles.push(sf.path());
					else simpleFilePaths.push(sf.path());
				});
			});
		}
		simpleFilePaths.forEach((sfp) => {
			config.postfix.forEach((pp) => {
				const relatedTestFile = removeExtension(sfp) + pp;
				if (fs.existsSync(relatedTestFile))
					if (toBeTestedFiles.indexOf(relatedTestFile) == -1)
						toBeTestedFiles.push(relatedTestFile);
			});
		});
		return toBeTestedFiles;
	} catch (error) {
		shell.echo(error);
		shell.exit(1);
	}
};

const runTests = (toBeTestedFiles) => {
	try {
		let hadError = false;
		let testFileNames = "";
		toBeTestedFiles.forEach((path, index) => {
			testFileNames += `\n<> ${index + 1} ${path}`;
		});

		shell.echo(
			`
<> ${toBeTestedFiles.length}${
				toBeTestedFiles.length === 1 ? " file" : " files"
			} marked to be tested.\n
${toBeTestedFiles.length > 0 ? testFileNames.cyan : "<> Nothing found to test."}
`
		);

		const command = config.command;

		toBeTestedFiles.reverse().forEach((path, index) => {
			shell.echo(`\n<#####> ${index + 1} ${path}`.blue.bgWhite);
			process.exe;
			const result = shell.exec(`${command} ${path} --color=always`);
			if (result.stderr != "" || result.code != "0") {
				shell.echo("An error occured".red);
				if (!config.batched) shell.exit(result.code);
				else hadError = true;
			}
		});

		if (config.batched && hadError) {
			shell.exit(1);
		}
	} catch (err) {
		shell.echo(err);
	}
};

const removeExtension = (path) => {
	let latestPeriodPostion = path.length;
	for (let i = path.length; i >= 0; i--) {
		if (path[i] == ".") {
			latestPeriodPostion = i;
			break;
		}
	}
	return path.slice(0, latestPeriodPostion);
};


args.option(
	"config",
	"Config file. If not present amet will search for config file in $cwd"
)
	.command("init", "Initialize an amet config file.", (name, sub, options) => {
		const { code: copyCode } = shell.cp(
			"-f",
			`${__dirname}/sample.config.toml`,
			process.cwd()
		);
		const { code: moveCode } = shell.mv(
			"-f",
			`${process.cwd()}/sample.config.toml`,
			`${process.cwd()}/amet.config.toml`
		);
		if (copyCode == 0 || moveCode == 0)
			shell.echo("Config file created successfuly.".green);
		else shell.echo("An error occured while creating config file.".red);
	})
	.command("run", "Run amet", (name, sub, options) => {
		main(options.config);
	});

args.parse(process.argv);

if (args.sub.length === 0) {
	args.showHelp();
	shell.exit(0);
}
