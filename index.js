// node wick
const {
	Package,
	Extractor,
} = require("node-wick");
const axios = require("axios")

// models
const Pak = require("./models/Pak");
const PakObject = require("./models/PakObject");
// exceptions
const SimpleFunctionException = require("./errors/SimpleFunctionException");
const InvalidPathException = require("./errors/InvalidPathException");
const ObjectUntextureableException = require("./errors/ObjectUntextureableException");
const ObjectParsingException = require("./errors/ObjectParsingException");
const ExtractorsMissingException = require("./errors/ExtractorsMissingException");
const LibUnmountedException = require("./errors/LibUnmountedException");
const PaksMissingException = require("./errors/PaksMissingException");
const LibMountedException = require("./errors/LibMountedException");
// utility
const {
	Collection,
} = require("discord.js");
const fs = require("fs");
const fetch = require("node-fetch");
const { filter } = require("mathjs");
require("colors");

class WickWrapper {
	/**
	 * - Wrapper for the module 'node-wick'
	 * @param {String} path
	 * @author Sprayxe
	 * @author tornado
	 */
	constructor(path = "C:\\Program Files\\Epic Games\\Fortnite\\FortniteGame\\Content\\Paks\\") {
		this.Path = path.endsWith("\\") ? path : path + "\\";
		/** @type {Collection<String, String>} */
		this.AesKeys = new Collection();
		/** @type {Collection<String, Extractor>} @private*/
		this.Extractors = new Collection();
		/** @type {Pak[]} @private*/
		this.Paks = [];
		/** @type {File[]} @private*/
		this.Files = [];
		/** @type {Boolean} @private */
		this.mounted = false;
		/** @type {Object} */
		this.sorted = {};
		/** @private*/
		this.sorting = {
			Characters: "FortniteGame/Content/Athena/Items/Cosmetics/Characters/",
			Heroes: "FortniteGame/Content/Athena/Heroes/HID_",
			Emotes: "FortniteGame/Content/Athena/Items/Cosmetics/Dances/",
			Backpacks: "FortniteGame/Content/Athena/Items/Cosmetics/Backpacks/",
			Specializations: "FortniteGame/Content/Athena/Heroes/Specializations/",
			Series: "FortniteGame/Content/Athena/Items/Cosmetics/Series/",
			Sprays: "FortniteGame/Content/Athena/Items/Cosmetics/Sprays/",
			LoadingScreens: "FortniteGame/Content/Athena/Items/Cosmetics/LoadingScreens/",
			Pickaxes: "FortniteGame/Content/Athena/Items/Cosmetics/Pickaxes/",
			Weapons: "FortniteGame/Content/Athena/Items/Weapons/",
			Ammo: "FortniteGame/Content/Items/Ammo/AmmoData",
			Balance: "FortniteGame/Content/Balance",
			Meta: "FortniteGame/Content/Athena/Items/Cosmetics/Metadata/",
			Contrails: "FortniteGame/Content/Athena/Items/Cosmetics/Contrails/",
			Wraps: "FortniteGame/Content/Athena/Items/Cosmetics/ItemWraps/",
			Toys: "FortniteGame/Content/Athena/Items/Cosmetics/Toys/",
			MusicPacks: "FortniteGame/Content/Athena/Items/Cosmetics/MusicPacks/",
			Gliders: "FortniteGame/Content/Athena/Items/Cosmetics/Gliders/",
			Banners: "FortniteGame/Content/2dAssets/Banners/",
			Emojis: "FortniteGame/Content/2dAssets/Emoji/",
			NpcItems: "Plugins/GameFeatures/BattlepassS15/Content/Items/NpcItems/",
			NpcTables: "Plugins/GameFeatures/BattlepassS15/Content/Balance/DataTables/",
			Quests: "Plugins/GameFeatures/BattlepassS15/Content/Items/QuestItems/",
		};
	}

	/**
	 * - Fetches aes keys from benbot and caches them
	 * @returns {Promise<Collection<String, String>>}
	 */
	async fetchAesKeys() {
		console.log("[AES] Fetching AES keys...".blue);
		const data = await (await fetch("https://fortnite-api.com/v2/aes?keyFormat=hex")).json();
		this.AesKeys.set("mainKey", data.data.mainKey);
		// dynamic keys
		const dynamicKeys = data.data.dynamicKeys;
		dynamicKeys.forEach(v => {
			this.AesKeys.set(v.pakFilename, v.key);
		});
		console.log(`[AES] Fetched ${this.AesKeys.size} AES keys!`.blue);
		// return collection
		return this.AesKeys;
	}

	/**
	 * - Checks if the mappings exist and builds them from benbot
	 * @returns {Promise<Collection<String, String>>}
	 */
	async buildMappings() {
		console.log("[MAPPINGS] Checking Mappings...".yellow);

		const dir = fs.existsSync(`${process.cwd()}/mappings`);
		const classes = fs.existsSync(`${process.cwd()}/mappings/classes`);
		const enums = fs.existsSync(`${process.cwd()}/mappings/enums`);

		if (!dir || !classes || !enums) {
			// create dir
			if (!dir) {
				fs.mkdirSync(`${process.cwd()}/mappings`);
				console.log("[MAPPINGS] Created Mappings Folder!".green);
			}
			// copy ucas/utoc files
			fs.mkdirSync(`${process.cwd()}/mappings/classes`);
			fs.mkdirSync(`${process.cwd()}/mappings/enums`);
			console.log("[MAPPINGS] Created Classes and Enums Folders!".green);
		}

		const url = (await (await fetch("https://benbotfn.tk/api/v1/mappings")).json())[0].url;

		return console.log(`[MAPPINGS] Cannot auto-write the usmap file! Download it from (${url}) and place it into the mappings folder.`.red.bold);
	}

	/**
	 * - Copies global utoc/ucas files from pak dir to /paks dir
	 * @returns {Promise<Collection<String, String>>}
	 */
	async buildGlobalResources() {
		console.log("[UTOC | UCAS] Checking resources...".yellow);

		const dir = fs.existsSync(`${process.cwd()}/paks`);
		const ucas = fs.existsSync(`${process.cwd()}/paks/global.ucas`);
		const utoc = fs.existsSync(`${process.cwd()}/paks/global.utoc`);

		if (!dir || !ucas || !utoc) {
			// create dir
			if (!dir) {
				fs.mkdirSync(`${process.cwd()}/paks`);
				console.log("[UTOC | UCAS] Created paks Folder!".green);
			}
			console.log(`${process.cwd()}`)
			// copy ucas/utoc files
			fs.copyFileSync(`${this.Path}/global.utoc`, `${process.cwd()}/paks/global.utoc`);
			fs.copyFileSync(`${this.Path}/global.ucas`, `${process.cwd()}/paks/global.ucas`);
			console.log("[UTOC | UCAS] Copied global utoc and ucas files!".green);
		}

		console.log("[UTOC | UCAS] Updated Resources!".green);
		return true;
	}

	/**
	 * - Mounts paks
	 * @returns {Promise<WickWrapper>}
	 */
	async mount() {
		if (!fs.existsSync(this.Path)) throw InvalidPathException(this.Path);
		await this.buildGlobalResources();

		console.log("[PAKS] Mounting paks...".yellow);
		if (this.mounted) throw LibMountedException();
		await this.fetchAesKeys();
		//	await this.buildMappings();

		const pakPath = this.Path;
		const pakMap = (fs.readdirSync(pakPath, "utf8").filter(v => v.endsWith(".pak") === true).map(v => {
			
			const filepath = pakPath + v;
			return {
				file: v,
				filepath: filepath,
			};
		})).filter(v => v);

		var failedPaks= 0
		var mountedPaks = 0
		this.Paks = pakMap;
		for (const pak of pakMap) {
			const pakName = pak.filepath.replace(".pak", "");

			// get aes key
			const key = this.AesKeys.get(pak.file) || this.AesKeys.get("mainKey");

			if (!this.Extractors.has(pakName)) {
				try {
					const extractor = new Extractor(pakName, key);
					this.Extractors.set(pakName, extractor);
					const files = extractor.get_file_list();
					files.forEach(name => {
						this.Files.push({
							file: name,
							pak: pakName,
						});
					});
					mountedPaks++ 
				} catch (e) {
					if (!e.message.includes("InvalidKeyIvLength")) {
						failedPaks++ 
					} else {
						failedPaks++ 
					}
				}
			}
		}
		console.log(`[PAKS] Failed: '${failedPaks}'`.red.bold)

		console.log(`[PAKS] Mounted: '${mountedPaks}'`.green.bold);

		this.mounted = true;
		return this;
	}

	/**
	 * - Get challenges
	 * @returns {Promise<Array[]>}
	 */
	async getChallenges() {
		this.checkStatus();

		const challenges = [];
		const filtered = this.Files.filter(f => f.file.includes("/Content/Items/QuestBundles/MissionBundle_S16_Week"));

		console.log(`[CHALLENGES] Found ${filtered.length} files!`.green.bold);

		filtered.forEach(async (f) => {
			const object = await this.exportObject(f.file);
			if (object.length && object[0].export) {
				const asset = object[0].export;
				challenges.push(asset.exports[0]);
			}
		});
		return challenges;
	}

	/**
	 * - Exports an object from paks
	 * @param {String} filePath Path to the object
	 * @returns {Promise<PakObject[]>}
	 */
	exportObject(filePath) {
		const name = filePath.split("/").pop().split(".")[0].toLowerCase();
		const object = {};

		const files = this.Files.filter(p => {
			const filepath = p;
			const filename = filepath.file.split("/").pop().split(".")[0].toLowerCase();
			return filename == name;
		});

		if (files && files.length > 0) {
			files.forEach((f) => {
				const extractor = this.Extractors.get(f.pak);
				const extension = f.file.split(".").pop();
				object[extension] = {
					data: extractor.get_file(f.file),
					path: f.file,
				};
			});
		}

		const final = [];
		if (object) {
			try {
				if (object.uasset && !object.ubulk) {
					const pak = new Package(object.uasset.data);
					final.push({
						uasset: object.uasset,
						export: pak.get_data(),
						package: pak,
					});
				} else if (object.uasset && object.ubulk) {
					const pak = new Package(object.uasset.data, object.ubulk.data);
					final.push({
						uasset: object.uasset,
						ubulk: object.ubulk,
						export: pak.get_data(),
						package: pak,
					});
				} else {
					const types = Object.keys(object);
					types.forEach((v, k) => {
						const pak = new Package(object[v].data);
						const obj = {};
						obj[v] = types[k];
						obj.export = pak.get_data();
						obj.package = pak;
						final.push(obj);
					});
				}
			} catch (e) {
				console.log(ObjectParsingException(e));
			}
		} else {
			throw InvalidPathException(filePath);
		}

		return final;
	}

	/**
	 * - Exports an object from paks
	 * @param {String} filePath Path to the object
	 * @returns {Promise<Buffer>}
	 */
	async exportTexture(filePath) {
		if (!filePath) throw SimpleFunctionException("Missing 'filePath' parameter");

		const obj = await this.exportObject(filePath);
		if (obj.length) {
			const asset = obj[0].export;
			if (!asset || !asset.exports || !asset.exports.length || asset.exports[0].export_type !== "Texture2D") throw ObjectUntextureableException(filePath);

			const buf = obj[0].package.get_texture();
			return buf;
		}
		else {
			throw InvalidPathException(filePath);
		}
	}

	/**
	 * - Checks stuff within the lib
	 * @private
	 */
	checkStatus() {
		if (!this.mounted) {
			throw LibUnmountedException();
		} else if (this.Paks.length < 1) {
			throw PaksMissingException();
		} else if (this.Extractors.size < 1) {
			throw ExtractorsMissingException();
		}
	}
}

module.exports = WickWrapper;
