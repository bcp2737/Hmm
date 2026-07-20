import { ModalFormData, ActionFormData, MessageFormData } from "@minecraft/server-ui";

/**
 * ==================== BASIC UI API ====================
 */
export const UIAPI = {
    // Modal form (text input, dropdown, toggle, slider)
    async modalForm(player, title = "Input", fields = []) {
        const form = new ModalFormData()
            .title(title);
        
        for (let field of fields) {
            if (field.type === "text") {
                form.textField(field.label, field.placeholder || "");
            } else if (field.type === "dropdown") {
                form.dropdown(field.label, field.options, field.default || 0);
            } else if (field.type === "toggle") {
                form.toggle(field.label, field.default || false);
            } else if (field.type === "slider") {
                form.slider(field.label, field.min || 0, field.max || 100, field.step || 1, field.default || 0);
            }
        }
        
        const response = await form.show(player);
        if (response.canceled) return null;
        return response.formValues;
    },
    
    // Action form (buttons)
    async actionForm(player, title = "Actions", body = "", buttons = []) {
        const form = new ActionFormData()
            .title(title)
            .body(body);
        
        for (let btn of buttons) {
            form.button(btn.text, btn.icon || null);
        }
        
        const response = await form.show(player);
        if (response.canceled) return -1;
        return response.selection;
    },
    
    // Message form (yes/no)
    async messageForm(player, title = "Confirm", body = "", buttonYes = "Yes", buttonNo = "No") {
        const form = new MessageFormData()
            .title(title)
            .body(body)
            .button1(buttonYes)
            .button2(buttonNo);
        
        const response = await form.show(player);
        if (response.canceled) return null;
        return response.selection === 0; // true = yes, false = no
    },
    
    // Title screen
    showTitle(player, title, subtitle = "", fadeIn = 0.5, stay = 3, fadeOut = 1) {
        try {
            player.onScreenDisplay.setTitle(title, { 
                fadeInDuration: fadeIn * 20,
                stayDuration: stay * 20,
                fadeOutDuration: fadeOut * 20,
                subtitle: subtitle
            });
            return true;
        } catch (e) {
            return false;
        }
    },
    
    // Action bar
    showActionBar(player, text) {
        try {
            player.onScreenDisplay.setActionBar(text);
            return true;
        } catch (e) {
            return false;
        }
    }
};

export default UIAPI;