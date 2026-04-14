import {
    buildMainMenuPreview,
    type MainMenuPreviewRequest,
} from "$lib/utils/mainMenuPreview";

self.onmessage = (event: MessageEvent<MainMenuPreviewRequest>) => {
    const preview = buildMainMenuPreview(event.data);
    self.postMessage(preview);
};

