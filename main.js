export class SendToApplication extends Application {
    static get defaultOptions() {
        const width = window.innerWidth;
        return mergeObject(super.defaultOptions, {
            id: 'send-to-dialog',
            template: 'modules/please-give-it-to-me/templates/send-to.html',
            title: game.i18n.localize('SENDTO.Title'),
            width: Math.min(500, Math.max(320, width * 0.4)),
            height: 'auto',
            classes: ['send-to-dialog'],
            resizable: true,
            minimizable: true
        });
    }

    constructor(item, options = {}) {
        if (!game.user.isGM) {
            ui.notifications.error("Seul le Game Master peut utiliser cette fonctionnalité.");
            return;
        }
        super(options);
        this.item = item;
    }

    getData() {
        if (!game.user.isGM) return {};
        
        // Récupérer tous les tokens de la scène active
        const tokens = canvas.tokens.placeables
            .filter(t => t.actor)
            .map(t => ({
                id: t.id,
                name: t.name,
                img: t.document.texture.src
            }));

        // Utiliser directement la traduction du système pour le type d'item
        const itemType = game.i18n.localize(CONFIG.Item.typeLabels[this.item.type] ?? this.item.type);

        return {
            tokens: tokens,
            item: {
                ...this.item,
                type: itemType
            }
        };
    }

    activateListeners(html) {
        super.activateListeners(html);

        if (!game.user.isGM) return;

        // Animer la liste déroulante au focus
        const select = html.find('select');
        select.focus(() => {
            select.parent().addClass('focused');
        }).blur(() => {
            select.parent().removeClass('focused');
        });

        // Gérer le redimensionnement de la fenêtre
        this.element.find('.window-content').on('resize', () => {
            this._updateHeight();
        });

        // Gérer le bouton Envoyer
        html.find('button[name="submit"]').click(async (ev) => {
            ev.preventDefault();
            const targetTokenId = html.find('[name="targetToken"]').val();
            const targetToken = canvas.tokens.get(targetTokenId);
            
            if (targetToken && targetToken.actor) {
                try {
                    await targetToken.actor.createEmbeddedDocuments('Item', [this.item.toObject()]);
                    ui.notifications.info(`${this.item.name} a été envoyé à ${targetToken.name}`);
                    this.close();
                } catch (error) {
                    ui.notifications.error(`Erreur lors de l'envoi de l'objet: ${error.message}`);
                }
            }
        });

        // Gérer le bouton Annuler
        html.find('button[name="cancel"]').click(() => this.close());

        // Ajuster la hauteur initiale
        this._updateHeight();
    }

    _updateHeight() {
        const content = this.element.find('.window-content');
        const form = content.find('.send-to-form');
        const availableHeight = window.innerHeight - 100; // Marge pour la barre de titre et les bordures
        const formHeight = form.outerHeight();
        
        if (formHeight > availableHeight) {
            content.css('height', `${availableHeight}px`);
            content.css('overflow-y', 'auto');
        } else {
            content.css('height', 'auto');
            content.css('overflow-y', 'visible');
        }
    }

    /** @override */
    setPosition(options = {}) {
        const position = super.setPosition(options);
        this._updateHeight();
        return position;
    }
}

Hooks.once('init', async function() {
    console.log('Please Give It To Me | Initializing module');
});

Hooks.once('ready', async function() {
    console.log('Please Give It To Me | Module ready');
});

Hooks.on('getItemDirectoryEntryContext', (html, contextOptions) => {
    // N'ajouter l'option du menu contextuel que pour le GM
    if (!game.user.isGM) return;
    
    contextOptions.push({
        name: game.i18n.localize('SENDTO.ContextMenu'),
        icon: '<i class="fas fa-paper-plane"></i>',
        condition: li => {
            const item = game.items.get(li.data('documentId'));
            return item !== null;
        },
        callback: li => {
            const item = game.items.get(li.data('documentId'));
            new SendToApplication(item).render(true);
        }
    });
});
