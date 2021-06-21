# amet
AMET (Aid Me Escape Tests)
A minimal tool to help you escape tests if you don't want to run all your tests every time you make major/minor changes.

## Why?

In some cases when your project is big enough it may hurt a bit if you run all your tests together just after every change. What if you filter test files according to your work or some patterns first and then enjoy testing less? Yes it would be easier and faster to go on.

## How?

AMET aids you escape your tests according to your codebase **git** log. AMET uses git log (both **change** and **commit** or one of them) to mark the files to be tested.
For example if you want to use AMET on a CI/CD environment instead of running tests in usual way AMET will handle it for you according to your committed files. Every files associated with committed files (according to the patterns specified in **amet.config.toml**) will be tested either in batch mode or single mode. This is how AMET helps you escape the test files of previous commits on unrelated ones.

## Get Started
First install `amet` from [npm](https://npmjs.com) by the command below:
```bash
npm install -g amet
```
or if you prefer yarn or other package managers:
```bash
yarn global add amet
```

Second step is to create a config file for AMET in your project directory. You can either create `amet.config.toml` manually or use the command below to ask AMET to give you a sample config file (it really gives you a file, does not create it).
```bash
amet init
```

The third step is to modify or setup config file according to the project.

## Configuration
Config file is in **toml** format containing some information about source, patterns, modes and other stuff.

### Sample Config File
The initial config file looks like this:
```
source = "git"
match = [ "[a-z]*\.spec\.js$", "[a-z]*\.test\.js$" ]
postfix = [".spec.js", ".test.js"]
command = "mocha"
batched = true
mode = ["change", "commit"]
```
##### source
The source value is set to `git` by default. Do not change it unless there are other sources and methods implmented in AMET maybe in later versions.

##### match
Match is a list of Regular Expressions of what you wanna filter in available files of latest commit or latest changes.

##### postfix
This is what is added to the end of the file name in which you have written the related tests. For example if your have a component inside a file named `component.js` and the file containing the tests has the name `component.spec.js` then the `postfix` in the config file will be a list/ array like this: `[".spec.js"]`.
Use this method to name your test files so AMET can help in a better and easier way.
The question is "Is it really needed to name files like this and specify a postfix in config file?" The answer is yes but why? It is hard to know, get and handle dependencies between files containing development code and test files, this is how AMET can solve the problem no matter which language/framework you are working with. With this method if you change any file, for example our previously mentioned `component.js`, AMET will add every `postfix` to end of file name (in this case `component`) and try to check whether if it exists or not. After that AMET will run test command specified in config file for every single test file chosen from latest commit or changes accroding to **match** and **postfix** values.


##### command
This is the command which you usually use to run test for a single test file. For example `mocha` is what is placed in sample config file and is used in node apps to run tests.

##### batched
This is a boolean value which indicates whether if you want to run all tests first and then use the results or run tests one by one and exit/terminate the execution with proper exit code after any error or test fail occurs.

##### mode
Mode is an array of strings with two values allowed inside it (you can put more but they wont have any effect, for now!). Those two are `commit` and `change`.
If mode array contains `commit` AMET will check last committed file changes to list and mark what it will test. 
If mode array contains `change` AMET will check local file changes to list those files.
You can add both of these values to the array and AMET will use both committed changes and local changes (staged or not) to do its work.