import StandardCheckDialog from "./standard-check-dialog.mjs";

/**
 * @typedef {Object} DiceCheckBonuses
 * @property {number} [aspectValeur=0]
 * @property {number} [acquisValeur=0]
 * @property {number} [attributValeur=0]
 * @property {number} [perisprit=0]
 * @property {number} [bonus=0]
 * @property {number} [malus=0]
 * @property {string} [rollMode]
 */

/**
 * @typedef {DiceCheckBonuses} StandardCheckData
 * @property {string} actorId                         L'ID de l'acteur a l'origine du jet
 * @property {Object} actorData                       Le contenu de system de l'acteur, de type
 * @property {string} qualite                         L'ID de la qualité, par exemple courage
 * @property {{name, valeur}[]} listeAcquis           Les acquis de l'esprit et les acquis collectifs du cabinet
 * @property {number} diff                            The target difficulty of the check
 * @property {string} type                            The type of check being performed : classique, opposition, libre
 */

/**
 * The standard (qualite)d6 dice pool check used by the system.
 *
 * @param {string|StandardCheckData} formula  This parameter is ignored
 * @param {StandardCheckData} [data]          An object of roll data, containing the following optional fields
 */
export default class StandardCheck extends Roll {
  constructor(formula, data) {
    if (typeof formula === "object") {
      data = formula;
      formula = "";
    }
    super(formula, data);
  }

  /**
   * Define the default data attributes for this type of Roll
   * @type {object}
   */
  static defaultData = {
    actorId: null,
    actorData: null,
    actingCharImg: null,
    actingCharName: null,
    diceTooltip: "",
    introText: "",
    composante: "corps",
    composanteValeur: 0,
    diceformula: "2d6",
    moyen: "action",
    moyenValeur: 0,
    metierOuTalent: false,
    critique: false,
    choices_composante: { corps: "Corps", coeur: "Coeur", esprit: "Esprit" },
    groupName_comp: "composante",
    choices_moyen: { action: "Action", perception: "Perception", resistance: "Résistance" },
    groupName_moyen: "moyen",
    choices_metier: { non: "Non", oui: "Oui" },
    metier: "non",
    groupName_metier: "metier",
    result: 0,
    rollMode: undefined,
  };

  /**
   * Which Dialog subclass should display a prompt for this Roll type?
   * @type {StandardCheckDialog}
   */
  static dialogClass = StandardCheckDialog;

  /**
   * The HTML template path used to render dice checks of this type
   * @type {string}
   */
  static htmlTemplate = "systems/ludiverse/templates/dice/standard-check-roll.hbs";

  /* -------------------------------------------- */
  /*  Roll Configuration                          */
  /* -------------------------------------------- */

  /** @override */
  _prepareData(data = {}) {
    const current = this.data || foundry.utils.deepClone(this.constructor.defaultData);
    for (let [k, v] of Object.entries(data)) {
      if (v === undefined) delete data[k];
    }
    data = foundry.utils.mergeObject(current, data, { insertKeys: false });
    StandardCheck.#configureData(data);
    return data;
  }

  /**
   * Configure the provided data used to customize this type of Roll
   * @param {object} data     The initially provided data object
   * @returns {object}        The configured data object
   */
  static #configureData(data) {
    data.metierOuTalent = data.metier === "oui";
    const composante = data.composante ? data.actorData.composantes[data.composante] : data.actorData.composantes.corps;
    data.composanteValeur = composante.valeur;
    const moyen = data.moyen ? data.actorData.moyens[data.moyen] : data.actorData.moyens.action;
    data.moyenValeur = moyen.valeur;
    const actingChar = game.actors.get(data.actorId);
    data.actingCharImg = actingChar.img;
    data.actingCharName = actingChar.name;
    data.introText = game.i18n.format("LUDIVERSE.chatmessage.introActionStd", { actingCharName: actingChar.name }) + (data.metier === "oui" ? " qui correspond à son métier ou ses talents" :"");
    data.finalText = "Le jet est critique !";
    if (!data.critique) {
      data.target = data.composanteValeur + data.moyenValeur + (data.metierOuTalent ? 1 : 0);
      data.finalText = "Action réussie si difficulté " + data.target.toString();

      if (data.target - data.result > 3) data.finalText = "Action réussie contre une difficulté <em>très difficile</em> ou moins";
      else if (data.target - data.result > 1) data.finalText = "Action réussie contre une difficulté <em>difficile</em> ou moins";
      else if (data.target - data.result > 0) data.finalText = "Action réussie contre une difficulté <em>malaisée</em> ou moins";
      else if (data.target - data.result > -1) data.finalText = "Action réussie contre une difficulté <em>normale</em> ou moins";
      else if (data.target - data.result > -2) data.finalText = "Action réussie contre une difficulté <em>aisée</em> ou moins";
      else if (data.target - data.result > -3) data.finalText = "Action réussie contre une difficulté <em>facile</em> ou moins";
      else if (data.target - data.result > -5) data.finalText = "Action réussie contre une difficulté <em>très facile</em> ou moins";
      else data.finalText = "Action ratée même contre une difficulté <em>très facile</em>";
    }
  }

  /** @override */
  static parse(_, data) {
    // Construct the formula

    let formula = "2d6";
    data.diceformula = formula;
    return super.parse(formula, data);
  }

  /* -------------------------------------------- */

  /** @override */
  async render(chatOptions = {}) {
    if (chatOptions.isPrivate) return "";
    return renderTemplate(this.constructor.htmlTemplate, this._getChatCardData());
  }

  /**
   * Prepare the data object used to render the StandardCheck object to an HTML template
   * @returns {object}      A prepared context object that is used to render the HTML template
   * @private
   */
  _getChatCardData() {
    const cardData = {
      css: [SYSTEM.id, "standard-check"],
      data: this.data,
      isGM: game.user.isGM,
      formula: this.formula,
      total: this.total,
    };
    cardData.compLabel = SYSTEM.COMPOSANTES[this.data.composante].label;
    cardData.moyenLabel = SYSTEM.MOYENS[this.data.moyen].label + " : " + this.data.moyenValeur.toString();
    cardData.imgComp = "/systems/ludiverse/assets/" + this.data.composante + ".png";
    cardData.imgMoyen = "/systems/ludiverse/assets/" + this.data.moyen + ".png";

    cardData.cssClass = cardData.css.join(" ");
    return cardData;
  }

  /**
   * Used to re-initialize the pool with different data
   * @param {object} data
   */
  initialize(data) {
    this.data = this._prepareData(data);
    this.terms = this.constructor.parse("", this.data);
  }

  /**
   * Present a Dialog instance for this pool
   * @param {string} title      The title of the roll request
   * @param {string} flavor     Any flavor text attached to the roll
   * @param {string} rollMode   The requested roll mode
   * @returns {Promise<StandardCheck|null>}   The resolved check, or null if the dialog was closed
   */
  async dialog({ title, flavor, rollMode } = {}) {
    const options = { title, flavor, rollMode, roll: this };
    return this.constructor.dialogClass.prompt({ title, options });
  }

  /** @inheritdoc */
  toJSON() {
    const data = super.toJSON();
    data.data = foundry.utils.deepClone(this.data);
    return data;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async toMessage(messageData, options = {}) {
    options.rollMode = options.rollMode || this.data.rollMode;
    return super.toMessage(messageData, options);
  }
  /** @override */
  async evaluate({ minimize = false, maximize = false, async = true } = {}) {
    await super.evaluate({ minimize, maximize, async });
    if (this._total === 2) this.data.critique = true;
    else if (this.data.metierOuTalent && this._total === 3) this.data.critique = true;
    this.data.diceTooltip = await this.getTooltip();
    this.data.result = this._total;
    return this;
  }
}
