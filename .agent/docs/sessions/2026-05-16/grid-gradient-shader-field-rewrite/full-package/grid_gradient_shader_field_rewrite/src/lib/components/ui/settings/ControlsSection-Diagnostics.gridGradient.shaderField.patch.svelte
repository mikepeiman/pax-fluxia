<!-- Patch into ControlsSection-Diagnostics.svelte inside the showGridGradientDiagnostics status-grid. -->

<div><span>Backend</span><code>{$gridGradientStats.drawBackend}</code></div>
<div>
    <span>Plan Cache</span>
    <span>
        {$gridGradientStats.planCacheHit ? 'hit' : 'miss'}
        {#if $gridGradientStats.planRebuildReason}
            <code>{$gridGradientStats.planRebuildReason}</code>
        {/if}
    </span>
</div>
<div>
    <span>Presentation Cache</span>
    <span>
        {$gridGradientStats.presentationCacheHit ? 'hit' : 'miss'}
        {#if $gridGradientStats.presentationRebuildReason}
            <code>{$gridGradientStats.presentationRebuildReason}</code>
        {/if}
    </span>
</div>
<div>
    <span>Texture Upload</span>
    <span>
        {$gridGradientStats.textureUploaded ? 'uploaded' : 'steady'} /
        {$gridGradientStats.textureUploadMs.toFixed(2)} ms /
        {Math.round($gridGradientStats.textureBytes / 1024).toLocaleString()} KB
    </span>
</div>
<div><span>Texture Pack</span><span>{$gridGradientStats.texturePackMs.toFixed(2)} ms</span></div>
<div><span>Distance Field</span><span>{$gridGradientStats.distanceBuildMs.toFixed(2)} ms</span></div>
<div><span>Owner Summary</span><span>{$gridGradientStats.ownerSummaryBuildMs.toFixed(2)} ms</span></div>
<div><span>Uniform Update</span><span>{$gridGradientStats.uniformUpdateMs.toFixed(2)} ms</span></div>
<div><span>Transition Cells</span><span>{$gridGradientStats.activeTransitionCells.toLocaleString()}</span></div>
<div><span>Outside Cells</span><span>{$gridGradientStats.outsideCells.toLocaleString()}</span></div>
<div><span>Shader Neighbor</span><code>{$gridGradientStats.shaderNeighborMode}</code></div>
<div><span>Shader Debug</span><code>{$gridGradientStats.shaderDebugMode}</code></div>
