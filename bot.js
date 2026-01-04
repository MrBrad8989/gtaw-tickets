require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ButtonBuilder,
    ButtonStyle,
    REST,
    Routes,
    SlashCommandBuilder,
    ChannelType,
    PermissionsBitField,
    Events,
    MessageFlags
} = require('discord.js');
const discordTranscripts = require('discord-html-transcripts');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// --- CONFIGURACIÓN DE ROLES ---
const SUPPORT_ROLE_ID = process.env.ROL_SOPORTE;

// --- CONFIGURACIÓN MAESTRA DE TICKETS ---
const TICKET_SETTINGS = {
    soporte: { 
        cat: process.env.CAT_SOPORTE, 
        log: process.env.LOG_SOPORTE, 
        roles: [process.env.ROL_SOPORTE, process.env.ROL_ADMIN],
        color: '#57F287', // Verde
        title: 'Soporte General'
    },
    bugs: { 
        cat: process.env.CAT_BUGS,    
        log: process.env.LOG_BUGS,    
        roles: [process.env.ROL_DEV, process.env.ROL_ADMIN],
        color: '#ED4245', // Rojo
        title: 'Reporte de Bugs'
    },
    cuenta: { 
        cat: process.env.CAT_CUENTA,  
        log: process.env.LOG_CUENTA,  
        roles: [process.env.ROL_SOPORTE, process.env.ROL_ADMIN],
        color: '#5865F2', // Azul Discord
        title: 'Problemas con mi cuenta'
    },
    premium: { 
        cat: process.env.CAT_PREMIUM, 
        log: process.env.LOG_PREMIUM, 
        roles: [process.env.ROL_ADMIN],
        color: '#FEE75C', // Amarillo
        title: 'Soporte Premium // Donaciones'
    }
};

const COUNTER_FILE = path.join(__dirname, 'data', 'ticket-counter.json');

// Estado del sistema
let systemConfig = { soporte: true, bugs: true, cuenta: true, premium: true };
let activePanel = { channelId: null, messageId: null };

// --- FUNCIONES DE UTILIDAD ---
function parseTicketTopic(topic) {
    const [ownerId = '', ticketId = '', messageId = '', claimedBy = ''] = (topic || '').split(';');
    return { ownerId, ticketId, messageId, claimedBy };
}

function buildTicketTopic({ ownerId = '', ticketId = '', messageId = '', claimedBy = '' }) {
    return [ownerId, ticketId, messageId, claimedBy].join(';');
}

async function getNextTicketId() {
    try {
        await fs.promises.mkdir(path.dirname(COUNTER_FILE), { recursive: true });
        let last = 0;
        try {
            const raw = await fs.promises.readFile(COUNTER_FILE, 'utf8');
            const data = JSON.parse(raw);
            if (typeof data.last === 'number') last = data.last;
        } catch (err) {}
        const next = last + 1;
        await fs.promises.writeFile(COUNTER_FILE, JSON.stringify({ last: next }, null, 2), 'utf8');
        return next;
    } catch (err) {
        return Date.now();
    }
}

function formatTicketId(num) {
    return num.toString().padStart(4, '0');
}

function sanitizeUsername(name) {
    return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 15) || 'user';
}

function generarMenuRow() {
    const opcionesMenu = [];
    // Emojis descriptivos y texto en Castellano
    if (systemConfig.soporte) opcionesMenu.push(new StringSelectMenuOptionBuilder().setLabel('Soporte General').setDescription('Dudas y asistencia técnica').setEmoji('🛠️').setValue('soporte'));
    if (systemConfig.bugs)    opcionesMenu.push(new StringSelectMenuOptionBuilder().setLabel('Reporte de Bugs').setDescription('Informar errores o fallos').setEmoji('🐛').setValue('bugs'));
    if (systemConfig.cuenta)  opcionesMenu.push(new StringSelectMenuOptionBuilder().setLabel('Problemas con mi cuenta').setDescription('Acceso, email y seguridad').setEmoji('🔐').setValue('cuenta'));
    if (systemConfig.premium) opcionesMenu.push(new StringSelectMenuOptionBuilder().setLabel('Soporte Donaciones').setDescription('Pagos y beneficios VIP').setEmoji('💎').setValue('premium'));

    if (opcionesMenu.length === 0) return null;
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('menu_main')
            .setPlaceholder('Selecciona el departamento de ayuda...')
            .addOptions(opcionesMenu)
    );
}

// --- FUNCIÓN PRINCIPAL: GENERAR Y ENVIAR PANEL ---
async function enviarPanel(channel) {
    // Diseño clásico limpio con Embed Oscuro, Logo a la derecha y Footer
    const embed = new EmbedBuilder()
        .setColor('#2b2d31') 
        .setTitle('CENTRO DE AYUDA - GTA:W VOICE ES')
        .setDescription('Bienvenido al sistema de soporte oficial.\nSelecciona la categoría que mejor se adapte a tu problema en el menú de abajo.')
        .setThumbnail(client.user.displayAvatarURL()) 
        .addFields(
            { 
                name: '🛠️ Soporte general del servidor', 
                value: 'Recibe soporte ante cualquier inquietud técnica o duda sobre el servidor.', 
                inline: false 
            },
            { 
                name: '🐛 Soporte de bugs', 
                value: 'Reporta un error o bug encontrado para que podamos repararlo.', 
                inline: false 
            },
            { 
                name: '🔐 Problemas con mi cuenta', 
                value: 'Problemas de acceso, correos, recuperación de cuenta o bloqueos.', 
                inline: false 
            },
            { 
                name: '💎 Soporte Premium // Donaciones', 
                value: 'Recibe ayuda en tus consultas sobre el VIP, GTA World Points o tu donación.', 
                inline: false 
            }
        )
        .setFooter({ text: 'GTA:W Voice ES ― Sistema de Tickets', iconURL: client.user.displayAvatarURL() });

    const row = generarMenuRow();
    const components = row ? [row] : [];
    
    return await channel.send({ embeds: [embed], components });
}

// --- REGISTRO DE COMANDOS ---
const commands = [
    new SlashCommandBuilder().setName('setup').setDescription('Genera el Panel de Soporte').setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    
    new SlashCommandBuilder().setName('sistema').setDescription('Gestión de categorías').addStringOption(o => o.setName('categoria').setDescription('Elige').setRequired(true).addChoices(
        {name:'Soporte',value:'soporte'}, {name:'Bugs',value:'bugs'}, {name:'Cuenta',value:'cuenta'}, {name:'Premium',value:'premium'}
    )).addBooleanOption(o => o.setName('estado').setDescription('On/Off').setRequired(true)),
    
    new SlashCommandBuilder().setName('add').setDescription('Añadir usuario al ticket').addUserOption(o => o.setName('usuario').setRequired(true).setDescription('Usuario')),
    new SlashCommandBuilder().setName('remove').setDescription('Echar usuario del ticket').addUserOption(o => o.setName('usuario').setRequired(true).setDescription('Usuario')),
    new SlashCommandBuilder().setName('rename').setDescription('Renombrar ticket').addStringOption(o => o.setName('nombre').setRequired(true).setDescription('Nombre')),
    
    new SlashCommandBuilder().setName('openticket').setDescription('Abre ticket manual').addUserOption(o => o.setName('usuario').setRequired(true).setDescription('Usuario')).addStringOption(o => o.setName('categoria').setRequired(true).setDescription('Tipo').addChoices({name:'Soporte',value:'soporte'}, {name:'Bugs',value:'bugs'}, {name:'Cuenta',value:'cuenta'}, {name:'Premium',value:'premium'})).addStringOption(o => o.setName('razon').setRequired(false).setDescription('Motivo'))
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// --- EVENTOS DEL CLIENTE ---
client.once(Events.ClientReady, async (c) => {
    // Estado "Jugando" o "Vigilando"
    c.user.setPresence({ 
        activities: [{ name: 'Sistema de Tickets | GTA:W ES', type: 0 }], 
        status: 'dnd' // No molestar (Rojo)
    });
    console.log(`✅ Bot Activo: ${c.user.tag}`);
    try {
        const route = process.env.GUILD_ID ? Routes.applicationGuildCommands(c.user.id, process.env.GUILD_ID) : Routes.applicationCommands(c.user.id);
        await rest.put(route, { body: commands });
        console.log('✨ Comandos actualizados.');
    } catch (e) { console.error(e); }
});

client.on(Events.InteractionCreate, async (interaction) => {
    
    // 1. SLASH COMMANDS
    if (interaction.isChatInputCommand()) {
        
        // --- SETUP ---
        if (interaction.commandName === 'setup') {
            try {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const msg = await enviarPanel(interaction.channel);
                activePanel.channelId = interaction.channelId;
                activePanel.messageId = msg.id;
                await interaction.editReply({ content: '✅ Panel configurado correctamente.' });
            } catch (e) { console.error(e); }
        }

        // --- SISTEMA ---
        if (interaction.commandName === 'sistema') {
            const c = interaction.options.getString('categoria');
            const s = interaction.options.getBoolean('estado');
            systemConfig[c] = s;

            if (activePanel.channelId && activePanel.messageId) {
                try {
                    const ch = await client.channels.fetch(activePanel.channelId);
                    try {
                        const oldMsg = await ch.messages.fetch(activePanel.messageId);
                        if (oldMsg) await oldMsg.delete();
                    } catch(err) { /* Ignorar si no existe */ }

                    const newMsg = await enviarPanel(ch);
                    activePanel.messageId = newMsg.id; 
                } catch(e) { console.error("Error al actualizar panel:", e); }
            }
            await interaction.reply({content: `⚙️ **${c.toUpperCase()}** ahora está ${s ? '🟢 ABIERTO' : '🔴 CERRADO'}`, flags: MessageFlags.Ephemeral });
        }

        // --- OPENTICKET ---
        if (interaction.commandName === 'openticket') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return interaction.reply({ content: '❌ Acceso denegado.', flags: MessageFlags.Ephemeral });
            const targetUser = interaction.options.getUser('usuario');
            const categoria = interaction.options.getString('categoria');
            const razon = interaction.options.getString('razon') || 'Apertura manual por Staff.';
            await createTicket(interaction, categoria, null, targetUser, razon);
        }

        // --- STAFF TOOLS ---
        if (interaction.commandName === 'add') {
            const u = interaction.options.getUser('usuario');
            if(interaction.channel.type !== ChannelType.GuildText) return interaction.reply({content:'❌ Solo en tickets.', flags: MessageFlags.Ephemeral });
            await interaction.channel.permissionOverwrites.edit(u.id, { ViewChannel: true, SendMessages: true, AttachFiles: true });
            await interaction.reply(`✅ **${u.username}** añadido.`);
        }
        if (interaction.commandName === 'remove') {
            const u = interaction.options.getUser('usuario');
            if(interaction.channel.type !== ChannelType.GuildText) return interaction.reply({content:'❌ Solo en tickets.', flags: MessageFlags.Ephemeral });
            await interaction.channel.permissionOverwrites.delete(u.id);
            await interaction.reply(`👋 **${u.username}** eliminado.`);
        }
        if (interaction.commandName === 'rename') {
            const n = interaction.options.getString('nombre');
            await interaction.channel.setName(n);
            await interaction.reply(`📝 Renombrado a: **${n}**`);
        }
    }

    // 2. MENÚ SELECCIÓN Y FORMULARIOS AVANZADOS
    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_main') {
        const val = interaction.values[0];
        if (!systemConfig[val]) return interaction.reply({content:'⛔ Categoría cerrada temporalmente.', flags: MessageFlags.Ephemeral });

        const modal = new ModalBuilder().setCustomId(`modal_${val}`).setTitle('Detalles de la Consulta');
        const rows = [];

        // --- CAMPOS COMUNES ---
        rows.push(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('gen_nombre').setLabel('Nombre y Apellido (/stats)').setStyle(TextInputStyle.Short).setPlaceholder('Ej: John Doe').setRequired(true)
        ));
        rows.push(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('gen_pcu').setLabel('URL de tu usuario de PCU').setStyle(TextInputStyle.Short).setPlaceholder('https://pcu.gtaw.es/perfil/...').setRequired(true)
        ));

        // --- CAMPOS ESPECÍFICOS ---
        if (val === 'soporte') {
            rows.push(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s_asunto').setLabel('Asunto').setStyle(TextInputStyle.Short).setRequired(true)));
            rows.push(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s_desc').setLabel('Descripción del problema').setStyle(TextInputStyle.Paragraph).setRequired(true)));
        } 
        else if (val === 'bugs') {
            rows.push(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b_sistema').setLabel('Sistema afectado').setStyle(TextInputStyle.Short).setRequired(true)));
            rows.push(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b_pasos').setLabel('Pasos para reproducir y Pruebas').setStyle(TextInputStyle.Paragraph).setRequired(true)));
        } 
        else if (val === 'cuenta') {
            rows.push(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('c_email').setLabel('Email asociado (si aplica)').setStyle(TextInputStyle.Short).setRequired(false)));
            rows.push(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('c_detalle').setLabel('Detalle del problema').setStyle(TextInputStyle.Paragraph).setRequired(true)));
        } 
        else if (val === 'premium') {
            rows.push(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('p_pago').setLabel('Correo de pago / Comprobante').setStyle(TextInputStyle.Short).setPlaceholder('email@ejemplo.com o ID Transacción').setRequired(true)));
            rows.push(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('p_duda').setLabel('Consulta o Problema').setStyle(TextInputStyle.Paragraph).setRequired(true)));
        }
        
        modal.addComponents(rows);
        await interaction.showModal(modal);
    }

    // 3. CREAR TICKET
    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_')) {
        await createTicket(interaction, interaction.customId.split('_')[1], interaction.fields);
    }

    // 4. BOTONES (CLOSE & CLAIM)
    if (interaction.isButton()) {
        if (interaction.customId === 'close') {
            const modal = new ModalBuilder().setCustomId('close_reason_modal').setTitle('Cerrar Ticket').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason').setLabel('Motivo').setStyle(TextInputStyle.Paragraph).setRequired(true)));
            await interaction.showModal(modal);
        }
        if (interaction.customId === 'claim') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            try {
                const topicData = parseTicketTopic(interaction.channel.topic);
                if (topicData.claimedBy === interaction.user.id) return await interaction.editReply('⚠️ Ya reclamado por ti.');
                
                topicData.claimedBy = interaction.user.id;
                await interaction.channel.setTopic(buildTicketTopic(topicData));

                let ticketMessage = null;
                if (topicData.messageId) { try { ticketMessage = await interaction.channel.messages.fetch(topicData.messageId); } catch (e) {} }
                if (!ticketMessage) { const msgs = await interaction.channel.messages.fetch({ limit: 10 }); ticketMessage = msgs.find(m => m.author.id === client.user.id && m.embeds.length > 0); }

                if (ticketMessage) {
                    const baseEmbed = EmbedBuilder.from(ticketMessage.embeds[0]);
                    const fields = baseEmbed.data.fields ? [...baseEmbed.data.fields] : [];
                    const fieldIndex = fields.findIndex(f => f.name === 'Atendido por');
                    const newField = { name: 'Atendido por', value: `<@${interaction.user.id}>`, inline: true };
                    if (fieldIndex >= 0) fields[fieldIndex] = newField; else fields.push(newField);
                    baseEmbed.setFields(fields);
                    await ticketMessage.edit({ embeds: [baseEmbed] });
                }

                await interaction.channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, SendMessages: true, AttachFiles: true });
                await interaction.editReply(`✅ Ticket atendido.`);
                
                // Renombrar
                const parts = interaction.channel.name.split('-');
                if(parts.length >= 2) {
                    const baseName = `${parts[0]}-${parts[1]}`;
                    const staffName = sanitizeUsername(interaction.user.username);
                    await interaction.channel.setName(`${baseName}-${staffName}`).catch(()=>{});
                }
            } catch (e) { await interaction.editReply('❌ Error al reclamar.'); }
        }
    }

    // 5. MODAL CIERRE (LOGS Y MD ESTILO FOTO)
    if (interaction.isModalSubmit() && interaction.customId === 'close_reason_modal') {
        const motivo = interaction.fields.getTextInputValue('reason');
        await interaction.reply('🔒 **Cerrando...**');
        
        const config = Object.values(TICKET_SETTINGS).find(c => c.cat === interaction.channel.parentId);
        const logChannel = config ? interaction.guild.channels.cache.get(config.log) : null;
        const topicData = parseTicketTopic(interaction.channel.topic);
        const userId = topicData.ownerId;
        const claimedUserId = topicData.claimedBy;
        const ticketId = topicData.ticketId || '0000';

        const attachment = await discordTranscripts.createTranscript(interaction.channel, { limit: -1, returnType: 'attachment', fileName: `${interaction.channel.name}.html`, minify: true, saveImages: true, poweredBy: false });

        // A. LOG EN CANAL DE STAFF
        if (logChannel) {
            const embedLog = new EmbedBuilder().setTitle(`Ticket Cerrado: ${interaction.channel.name}`).setColor(config.color || 'Grey').addFields({ name: 'Usuario', value: userId ? `<@${userId}>` : 'N/A', inline: true }, { name: 'Cerrado por', value: `${interaction.user}`, inline: true }, { name: 'Motivo', value: motivo }).setTimestamp();
            await logChannel.send({ embeds: [embedLog], files: [attachment] });
        }

        // B. MENSAJE DIRECTO (MD) AL USUARIO -- ESTILO FOTO SOLICITADA --
        if (userId) { 
            try { 
                const user = await client.users.fetch(userId); 
                
                // Embed idéntico a la foto (image_2f13e5.png)
                const dmEmbed = new EmbedBuilder()
                    .setTitle('🎫 Ticket Cerrado')
                    .setColor('#2b2d31') // Color oscuro
                    .setDescription(`Su ticket **${interaction.channel.name}** ha sido cerrado.`)
                    .addFields(
                        { name: 'Ticket ID', value: `#${ticketId}`, inline: true },
                        { name: 'Staff', value: `${interaction.user.username}`, inline: true },
                        { name: 'Reclamado por', value: claimedUserId ? `<@${claimedUserId}>` : 'N/A', inline: true },
                        { name: 'Motivo', value: motivo, inline: false },
                        { name: 'Fecha', value: new Date().toLocaleString(), inline: false }
                    )
                    .setFooter({ text: 'GTA:W Voice ES', iconURL: client.user.displayAvatarURL() });

                await user.send({ embeds: [dmEmbed] });
            } catch (e) { console.log('No se pudo enviar MD (Usuario bloqueado o MD cerrados).'); } 
        }
        
        setTimeout(() => interaction.channel.delete().catch(()=>{}), 5000);
    }
});

// --- FUNCIÓN DE CREACIÓN DE TICKET ---
async function createTicket(interaction, tipo, fields, targetUser = null, manualReason = null) {
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const ticketOwner = targetUser || interaction.user;
    let camposEmbed = [];
    let description = "";
    
    const config = TICKET_SETTINGS[tipo];
    if (!config) return interaction.editReply("❌ Error de configuración.");
    const ticketSeq = await getNextTicketId();
    const ticketCode = formatTicketId(ticketSeq);

    if (fields) {
        // Campos Comunes
        const nombreIC = fields.getTextInputValue('gen_nombre');
        const pcuLink = fields.getTextInputValue('gen_pcu');
        camposEmbed.push({ name: '👤 Nombre y Apellido', value: nombreIC, inline: true });
        camposEmbed.push({ name: '🔗 Perfil PCU', value: pcuLink, inline: true });

        // Campos Específicos
        if (tipo === 'soporte') { 
            description = `**Asunto:** ${fields.getTextInputValue('s_asunto')}`; 
            camposEmbed.push({ name: 'Descripción', value: fields.getTextInputValue('s_desc') }); 
        }
        else if (tipo === 'bugs') { 
            description = `**Sistema:** ${fields.getTextInputValue('b_sistema')}`; 
            camposEmbed.push({ name: 'Pasos y Pruebas', value: fields.getTextInputValue('b_pasos') }); 
        }
        else if (tipo === 'cuenta') { 
            const mail = fields.getTextInputValue('c_email');
            if(mail) camposEmbed.push({ name: 'Email', value: mail }); 
            camposEmbed.push({ name: 'Problema', value: fields.getTextInputValue('c_detalle') }); 
        }
        else if (tipo === 'premium') { 
            camposEmbed.push({ name: '💳 Comprobante / Pago', value: fields.getTextInputValue('p_pago') }); 
            camposEmbed.push({ name: 'Consulta', value: fields.getTextInputValue('p_duda') }); 
        }
    } else {
        description = manualReason || "Ticket manual.";
    }

    try {
        const roleOverwrites = (config.roles || []).filter(Boolean).map(r => ({ id: r, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }));
        const channel = await interaction.guild.channels.create({
            name: `${tipo}-${ticketCode}`, type: ChannelType.GuildText, parent: config.cat,
            permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }, { id: ticketOwner.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] }, { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel] }, ...roleOverwrites]
        });

        await interaction.editReply(`✅ Ticket creado: ${channel}`);
        
        const tEmbed = new EmbedBuilder()
            .setTitle(`${config.title} (#${ticketCode})`)
            .setColor(config.color)
            .setDescription(`Hola ${ticketOwner}, gracias por contactar.\n\n${description}\n\n⚠️ **Nota:** Espera a ser atendido por un miembro del Staff.`)
            .addFields(camposEmbed)
            .setTimestamp()
            .setThumbnail(client.user.displayAvatarURL());
        
        const btnRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('claim').setLabel('Atender').setStyle(ButtonStyle.Success).setEmoji('🙋‍♂️'), new ButtonBuilder().setCustomId('close').setLabel('Cerrar').setStyle(ButtonStyle.Danger).setEmoji('🔒'));
        const supportMention = SUPPORT_ROLE_ID ? `<@&${SUPPORT_ROLE_ID}>` : '';
        
        const msg = await channel.send({ content: supportMention ? `${ticketOwner} | 🔔 Staff: ${supportMention}` : `${ticketOwner}`, embeds: [tEmbed], components: [btnRow] });
        await channel.setTopic(buildTicketTopic({ ownerId: ticketOwner.id, ticketId: ticketCode, messageId: msg.id }));
    } catch (e) { console.error(e); await interaction.editReply('❌ Error al crear canal.'); }
}

client.login(process.env.TOKEN);