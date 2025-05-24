// src/flow.js - CORRECTED VERSION WITH PROPER POSITIONING
// Dropdowns positioned relative to their buttons, sidebar moves naturally with viewport

// IMPROVED NUCLEAR DROPDOWN IMPLEMENTATION - Positioning relative to buttons
function initDropdownsNuclear() {
    console.log('🚀 NUCLEAR DROPDOWN INIT - Complete JS override with button-relative positioning');
    
    // Remove ALL existing CSS classes that might interfere
    const allDropdowns = document.querySelectorAll('.dropdown-control, .download-dropdown');
    allDropdowns.forEach(dropdown => {
        dropdown.classList.remove('open');
    });
    
    // Initialize control dropdowns (symmetry, topology, texture)
    initControlDropdownsNuclear();
    
    // Initialize download dropdown
    initDownloadDropdownNuclear();
    
    console.log('✅ Nuclear dropdown initialization complete');
}

function initControlDropdownsNuclear() {
    const dropdowns = document.querySelectorAll('.dropdown-control');
    console.log(`🔽 Nuclear init for ${dropdowns.length} control dropdowns`);
    
    dropdowns.forEach((dropdown, index) => {
        const dropdownId = dropdown.id;
        console.log(`🔽 Nuclear setup for: ${dropdownId}`);
        
        const display = dropdown.querySelector('.dropdown-display');
        const optionsContainer = dropdown.querySelector('.dropdown-options');
        const optionElements = dropdown.querySelectorAll('.dropdown-option');
        
        if (!display || !optionsContainer || !optionElements.length) {
            console.warn(`❌ Missing elements for ${dropdownId}`);
            return;
        }
        
        // NUCLEAR: Completely recreate the dropdown options as an absolutely positioned div
        const nuclearOptions = createNuclearOptionsContainer(dropdown, optionsContainer, optionElements);
        
        // NUCLEAR: Replace the original options with our JS-controlled version
        optionsContainer.style.display = 'none'; // Hide original
        
        // NUCLEAR: Handle click events with complete JS control
        display.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log(`🔽 Nuclear click on ${dropdownId}`);
            
            // Check if controls are disabled - PREVENT interaction if disabled
            const controlsSidebar = document.querySelector('.controls-sidebar');
            if (controlsSidebar && controlsSidebar.classList.contains('disabled')) {
                console.log('🚫 Controls disabled - dropdown interaction blocked');
                return; // Don't allow interaction when disabled
            }
            
            // Check if this dropdown is currently open
            const isCurrentlyOpen = dropdown.classList.contains('open') && nuclearOptions.style.display === 'block';
            
            // Close all nuclear dropdowns first
            closeAllNuclearDropdowns();
            
            // If it wasn't open, open it now (toggle behavior)
            if (!isCurrentlyOpen) {
                showNuclearOptions(nuclearOptions, dropdown);
                dropdown.classList.add('open');
                console.log(`🔽 Nuclear opened: ${dropdownId}`);
            } else {
                console.log(`🔽 Nuclear closed: ${dropdownId} (was already open)`);
            }
        });
        
        console.log(`✅ Nuclear setup complete for ${dropdownId}`);
    });
    
    // Global click handler to close nuclear dropdowns
    document.addEventListener('click', (e) => {
        const clickedDropdown = e.target.closest('.dropdown-control');
        if (!clickedDropdown) {
            closeAllNuclearDropdowns();
        }
    });
}

function createNuclearOptionsContainer(dropdown, originalOptions, originalOptionElements) {
    // Create completely new options container with JS-controlled positioning
    const nuclearOptions = document.createElement('div');
    nuclearOptions.className = 'nuclear-dropdown-options';
    nuclearOptions.dataset.dropdownId = dropdown.id; // Add identifier
    
    // CORRECTED: Use absolute positioning relative to document, not viewport
    nuclearOptions.style.cssText = `
        position: absolute !important;
        background: rgba(255, 255, 255, 0.12) !important;
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
        border-radius: 8px !important;
        z-index: 999999 !important;
        backdrop-filter: blur(20px) !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
        display: none !important;
        min-width: 150px !important;
        max-width: 300px !important;
        max-height: 200px !important;
        overflow-y: auto !important;
        padding: 4px !important;
        margin: 0 !important;
        pointer-events: auto !important;
        opacity: 1 !important;
        visibility: visible !important;
        box-sizing: border-box !important;
    `;
    
    // Copy all original options into the nuclear container
    originalOptionElements.forEach((originalOption, index) => {
        const nuclearOption = document.createElement('div');
        nuclearOption.className = 'nuclear-dropdown-option';
        nuclearOption.textContent = originalOption.textContent;
        nuclearOption.dataset.value = originalOption.dataset.value;
        
        nuclearOption.style.cssText = `
            padding: 0.7rem 1rem !important;
            cursor: pointer !important;
            color: rgba(255, 255, 255, 0.8) !important;
            font-family: 'Sora', sans-serif !important;
            font-size: 0.9rem !important;
            text-align: right !important;
            background: transparent !important;
            border: none !important;
            width: 100% !important;
            box-sizing: border-box !important;
            transition: all 0.2s ease !important;
            margin: 0 !important;
            border-radius: 4px !important;
        `;
        
        // Handle option selection
        nuclearOption.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const value = nuclearOption.dataset.value;
            const text = nuclearOption.textContent;
            
            console.log(`🔧 Nuclear selected ${dropdown.id}: ${value} (${text})`);
            
            // Update the display text
            const valueElement = dropdown.querySelector('.dropdown-value');
            if (valueElement) {
                valueElement.textContent = text;
            }
            
            // Update selected state - clear all first
            nuclearOptions.querySelectorAll('.nuclear-dropdown-option').forEach(opt => {
                opt.style.backgroundColor = 'transparent';
                opt.style.color = 'rgba(255, 255, 255, 0.8)';
                opt.classList.remove('selected');
            });
            
            // Set this option as selected with proper styling
            nuclearOption.style.backgroundColor = 'rgba(0, 188, 212, 0.2)';
            nuclearOption.style.color = '#00e5ff';
            nuclearOption.classList.add('selected');
            
            // Close dropdown
            hideNuclearOptions(nuclearOptions);
            dropdown.classList.remove('open');
            updateDropdownArrow(dropdown, false); // Reset arrow
            
            // Handle dropdown-specific logic
            handleDropdownChange(dropdown.id, value, text);
            triggerHiddenButton(dropdown.id, value);
        });
        
        // Hover effects
        nuclearOption.addEventListener('mouseenter', () => {
            if (!nuclearOption.classList.contains('selected')) {
                nuclearOption.style.backgroundColor = 'rgba(0, 188, 212, 0.15)';
                nuclearOption.style.color = '#00bcd4';
            }
        });
        
        nuclearOption.addEventListener('mouseleave', () => {
            if (!nuclearOption.classList.contains('selected')) {
                nuclearOption.style.backgroundColor = 'transparent';
                nuclearOption.style.color = 'rgba(255, 255, 255, 0.8)';
            }
        });
        
        nuclearOptions.appendChild(nuclearOption);
    });
    
    // CORRECTED: Add to body for absolute positioning relative to document
    document.body.appendChild(nuclearOptions);
    
    return nuclearOptions;
}

// CORRECTED: Positioning relative to button, using absolute positioning
function showNuclearOptions(nuclearOptions, dropdown) {
    const displayElement = dropdown.querySelector('.dropdown-display');
    const displayRect = displayElement.getBoundingClientRect();
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    // CORRECTED: Add scroll offsets for absolute positioning
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    // Use exact width from the actual button
    const exactWidth = displayRect.width;
    
    // Calculate position relative to document (add scroll offsets for absolute positioning)
    let left = displayRect.left + scrollX;
    let top = displayRect.bottom + scrollY + 4;
    let isPositionedAbove = false;
    
    // Set exact width first, then show to measure height
    nuclearOptions.style.width = exactWidth + 'px';
    nuclearOptions.style.display = 'block';
    
    // Get actual dropdown dimensions after setting width
    const dropdownHeight = nuclearOptions.offsetHeight;
    
    // Check if dropdown fits below, if not show above
    if (displayRect.bottom + dropdownHeight > viewportHeight - 10) {
        // Show above instead
        top = displayRect.top + scrollY - dropdownHeight - 4;
        isPositionedAbove = true;
        console.log('🔽 Positioning above due to space constraints');
    }
    
    // Ensure dropdown doesn't go off left or right edge
    if (displayRect.left < 5) {
        left = scrollX + 5;
        console.log('🔽 Adjusting left position to stay on screen');
    } else if (displayRect.left + exactWidth > viewportWidth - 5) {
        left = scrollX + viewportWidth - exactWidth - 5;
        console.log('🔽 Adjusting right position to stay on screen');
    }
    
    // Ensure dropdown doesn't go off top
    if (displayRect.top - dropdownHeight < 5 && isPositionedAbove) {
        top = scrollY + 5;
        console.log('🔽 Adjusting top position to stay on screen');
    }
    
    // Apply final position with exact measurements
    nuclearOptions.style.left = left + 'px';
    nuclearOptions.style.top = top + 'px';
    nuclearOptions.style.width = exactWidth + 'px';
    
    console.log(`🔽 Nuclear options positioned at: ${left}, ${top} (exact width: ${exactWidth}px, above: ${isPositionedAbove})`);
    
    // Update arrow direction based on positioning
    updateDropdownArrow(dropdown, true, isPositionedAbove);
    
    // Highlight the currently selected option
    highlightSelectedOption(nuclearOptions, dropdown);
    
    // Ensure it's visible with proper layering
    nuclearOptions.style.opacity = '1';
    nuclearOptions.style.visibility = 'visible';
    nuclearOptions.style.pointerEvents = 'auto';
    nuclearOptions.style.position = 'absolute'; // Ensure it stays absolute
}

function hideNuclearOptions(nuclearOptions) {
    nuclearOptions.style.display = 'none';
}

// Add function to update dropdown arrow direction based on positioning
function updateDropdownArrow(dropdown, isOpen, isPositionedAbove = false) {
    const arrow = dropdown.querySelector('.dropdown-arrow');
    if (!arrow) return;
    
    if (!isOpen) {
        // Closed state - arrow points right
        arrow.style.transform = 'rotate(0deg)';
    } else {
        // Open state - arrow direction depends on dropdown position
        if (isPositionedAbove) {
            arrow.style.transform = 'rotate(-90deg)'; // Point up
        } else {
            arrow.style.transform = 'rotate(90deg)'; // Point down
        }
    }
}

// Add function to highlight selected option when dropdown opens
function highlightSelectedOption(nuclearOptions, dropdown) {
    const currentValue = dropdown.querySelector('.dropdown-value').textContent;
    
    // Clear all selections first
    nuclearOptions.querySelectorAll('.nuclear-dropdown-option').forEach(opt => {
        opt.style.backgroundColor = 'transparent';
        opt.style.color = 'rgba(255, 255, 255, 0.8)';
        opt.classList.remove('selected');
    });
    
    // Find and highlight the currently selected option
    nuclearOptions.querySelectorAll('.nuclear-dropdown-option').forEach(opt => {
        if (opt.textContent === currentValue) {
            opt.style.backgroundColor = 'rgba(0, 188, 212, 0.2)';
            opt.style.color = '#00e5ff';
            opt.classList.add('selected');
            console.log(`🎯 Highlighted selected option: ${currentValue}`);
        }
    });
}

// CORRECTED: Missing function that was causing the error
function closeAllNuclearDropdowns() {
    console.log('🔒 Closing all nuclear dropdowns');
    
    // Close control dropdowns
    document.querySelectorAll('.nuclear-dropdown-options').forEach(options => {
        hideNuclearOptions(options);
    });
    
    // Close download dropdown
    document.querySelectorAll('.nuclear-download-options').forEach(options => {
        hideNuclearOptions(options);
    });
    
    // Remove open classes from all dropdowns
    document.querySelectorAll('.dropdown-control').forEach(dropdown => {
        dropdown.classList.remove('open');
        updateDropdownArrow(dropdown, false); // Reset arrow to closed state
    });
    
    document.querySelectorAll('.download-dropdown').forEach(dropdown => {
        dropdown.classList.remove('open');
        updateDropdownArrow(dropdown, false); // Reset arrow to closed state
    });
    
    console.log('✅ All nuclear dropdowns closed');
}

// CORRECTED: Better download dropdown with enhanced positioning
function initDownloadDropdownNuclear() {
    const downloadDropdown = document.querySelector('.download-dropdown');
    const downloadTrigger = document.querySelector('.download-trigger');
    const originalDownloadOptions = document.querySelector('.download-options');
    const downloadButtons = document.querySelectorAll('.download-option');

    if (!downloadDropdown || !downloadTrigger || !originalDownloadOptions) {
        console.warn('❌ Download dropdown elements not found');
        return;
    }

    console.log('🔽 Nuclear setup for download dropdown');

    // Create nuclear download options
    const nuclearDownloadOptions = document.createElement('div');
    nuclearDownloadOptions.className = 'nuclear-download-options';
    nuclearDownloadOptions.style.cssText = `
        position: absolute !important;
        background: rgba(255, 255, 255, 0.12) !important;
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
        border-radius: 8px !important;
        z-index: 999999 !important;
        backdrop-filter: blur(20px) !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
        display: none !important;
        min-width: 150px !important;
        max-width: 300px !important;
        max-height: 200px !important;
        overflow-y: auto !important;
        padding: 4px !important;
        margin: 0 !important;
        pointer-events: auto !important;
        opacity: 1 !important;
        visibility: visible !important;
        box-sizing: border-box !important;
    `;

    // Copy download options
    downloadButtons.forEach(originalButton => {
        const nuclearButton = document.createElement('div');
        nuclearButton.className = 'nuclear-download-option';
        nuclearButton.textContent = originalButton.textContent;
        nuclearButton.dataset.format = originalButton.id.replace('download', '').toLowerCase();
        
        nuclearButton.style.cssText = `
            padding: 0.7rem 1rem !important;
            cursor: pointer !important;
            color: rgba(255, 255, 255, 0.8) !important;
            font-family: 'Sora', sans-serif !important;
            font-size: 0.9rem !important;
            text-align: right !important;
            background: transparent !important;
            border: none !important;
            width: 100% !important;
            box-sizing: border-box !important;
            transition: all 0.2s ease !important;
            margin: 0 !important;
            border-radius: 4px !important;
        `;
        
        // Handle download option click
        nuclearButton.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const format = nuclearButton.dataset.format;
            console.log(`📥 Nuclear download: ${format.toUpperCase()}`);
            
            // Close dropdown
            hideNuclearOptions(nuclearDownloadOptions);
            downloadDropdown.classList.remove('open');
            
            // Call download function
            if (window.downloadModel) {
                window.downloadModel(format);
            }
        });
        
        // Hover effects
        nuclearButton.addEventListener('mouseenter', () => {
            nuclearButton.style.backgroundColor = 'rgba(0, 188, 212, 0.15)';
            nuclearButton.style.color = '#00bcd4';
        });
        
        nuclearButton.addEventListener('mouseleave', () => {
            nuclearButton.style.backgroundColor = 'transparent';
            nuclearButton.style.color = 'rgba(255, 255, 255, 0.8)';
        });
        
        nuclearDownloadOptions.appendChild(nuclearButton);
    });

    // Hide original download options
    originalDownloadOptions.style.display = 'none';
    
    // Add nuclear options to body
    document.body.appendChild(nuclearDownloadOptions);

    // Handle download trigger click
    downloadTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Only work if downloads are ready
        const actionButtons = downloadDropdown.closest('.action-buttons');
        if (!actionButtons || !actionButtons.classList.contains('downloads-ready')) {
            console.log('📥 Download not ready yet');
            return;
        }
        
        console.log('🔽 Nuclear download dropdown clicked');
        
        // Check if this download dropdown is currently open
        const isCurrentlyOpen = downloadDropdown.classList.contains('open') && nuclearDownloadOptions.style.display === 'block';
        
        // Close all nuclear dropdowns first
        closeAllNuclearDropdowns();
        
        // If it wasn't open, open it now (toggle behavior)
        if (!isCurrentlyOpen) {
            // Use enhanced positioning logic for download dropdown
            showNuclearDownloadOptions(nuclearDownloadOptions, downloadTrigger);
            downloadDropdown.classList.add('open');
            console.log('🔽 Nuclear download dropdown opened');
        } else {
            console.log('🔽 Nuclear download dropdown closed (was already open)');
        }
    });

    // Close download dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!downloadDropdown.contains(e.target) && !nuclearDownloadOptions.contains(e.target)) {
            hideNuclearOptions(nuclearDownloadOptions);
            downloadDropdown.classList.remove('open');
        }
    });

    console.log('✅ Nuclear download dropdown setup complete');
}

// CORRECTED: Enhanced download dropdown positioning relative to button
function showNuclearDownloadOptions(nuclearOptions, triggerElement) {
    const triggerRect = triggerElement.getBoundingClientRect();
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    // CORRECTED: Add scroll offsets for absolute positioning
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    // Set width to exactly match trigger for perfect alignment
    const exactWidth = triggerRect.width;
    nuclearOptions.style.width = exactWidth + 'px';
    nuclearOptions.style.display = 'block';
    
    const dropdownHeight = nuclearOptions.offsetHeight;
    let isPositionedAbove = false;
    
    // Smart positioning - try above first since download is usually at bottom
    let left = triggerRect.left + scrollX; // Add scrollX for absolute positioning
    let top = triggerRect.top + scrollY - dropdownHeight - 8; // 8px gap above, add scrollY
    
    // If doesn't fit above, position below
    if (triggerRect.top - dropdownHeight < 10) {
        top = triggerRect.bottom + scrollY + 8; // 8px gap below, add scrollY
        isPositionedAbove = false;
        console.log('🔽 Download dropdown positioned below due to space');
    } else {
        isPositionedAbove = true;
        console.log('🔽 Download dropdown positioned above');
    }
    
    // Simple boundary checks - only adjust if dropdown goes completely off screen
    if (triggerRect.left < 0) {
        left = scrollX + 5;
    }
    if (triggerRect.left + exactWidth > viewportWidth) {
        left = scrollX + viewportWidth - exactWidth - 5;
    }
    
    // Apply position with exact width
    nuclearOptions.style.left = left + 'px';
    nuclearOptions.style.top = top + 'px';
    nuclearOptions.style.width = exactWidth + 'px';
    
    // Update download dropdown arrow direction
    const downloadDropdown = triggerElement.closest('.download-dropdown');
    updateDropdownArrow(downloadDropdown, true, isPositionedAbove);
    
    console.log(`🔽 Download options positioned at: ${left}, ${top} (exact width: ${exactWidth}px, above: ${isPositionedAbove})`);
}

// MAIN FLOW FUNCTION WITH NUCLEAR DROPDOWNS
function initFlow() {
  const imageInput = document.getElementById("imageInput");
  const controlsSidebar = document.querySelector(".controls-sidebar");
  const generateBtn = document.getElementById("generateBtn");
  const actionButtons = document.querySelector(".action-buttons");
  const pbrButtons = document.getElementById("pbrButtons");
  const pbrCheckbox = document.getElementById("pbrCheckbox");
  const statusMessage = document.getElementById("statusMsg");
  const progressSection = document.querySelector(".progress-section");

  // NUCLEAR: Use nuclear dropdown initialization instead of regular dropdowns
  initDropdownsNuclear();
  
  // Initialize image preview functionality
  initImagePreview();

  // Initially: controls are disabled (greyed out) until image is uploaded
  controlsSidebar.classList.add('disabled');
  generateBtn.disabled = true;
  
  // Set up initial disabled state visual feedback
  setTimeout(() => {
    updateDropdownDisabledState();
  }, 100);

  // When an image is selected
  imageInput.addEventListener("change", () => {
    const file = imageInput?.files[0];
    if (!file) {
      // No file selected - disable controls again
      controlsSidebar.classList.add('disabled');
      generateBtn.disabled = true;
      updateDropdownDisabledState(); // Update visual feedback
      return;
    }

    console.log("📁 Image selected:", file.name);
    
    // Enable all controls with smooth animation
    setTimeout(() => {
      controlsSidebar.classList.remove('disabled');
      generateBtn.disabled = false;
      updateDropdownDisabledState(); // Update visual feedback
    }, 100);

    // Show PBR controls if texture is set to true
    const textureDropdown = document.getElementById('textureDropdown');
    if (textureDropdown) {
      const currentTextureValue = textureDropdown.querySelector('.dropdown-value').textContent;
      if (currentTextureValue === 'Yes') {
        showPBRControls();
      }
    }
  });

  // Handle PBR checkbox
  if (pbrCheckbox) {
    pbrCheckbox.addEventListener("change", (e) => {
      window.enablePBR = e.target.checked;
      console.log(`🔘 PBR enabled: ${window.enablePBR}`);
    });
  }
}

// Mobile navigation toggle function
function toggleMobileNav() {
  const mobileNav = document.getElementById('mobileNav');
  const hamburger = document.querySelector('.hamburger');
  mobileNav.classList.toggle('active');
  hamburger.classList.toggle('active');
}

// Make toggleMobileNav globally available
window.toggleMobileNav = toggleMobileNav;

// Image preview functionality
function initImagePreview() {
  const imageInput = document.getElementById('imageInput');
  const uploadPreview = document.getElementById('uploadPreview');
  const uploadText = document.querySelector('.upload-text');

  if (!imageInput || !uploadPreview || !uploadText) {
    console.warn('Image preview elements not found');
    return;
  }

  imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function(e) {
        uploadPreview.style.backgroundImage = `url(${e.target.result})`;
        uploadPreview.classList.add('visible');
        uploadText.style.display = 'none';
      };
      reader.readAsDataURL(file);
    } else {
      // Reset if no valid image
      uploadPreview.style.backgroundImage = '';
      uploadPreview.classList.remove('visible');
      uploadText.style.display = 'block';
    }
  });
}

// Status overlay helper functions (for generation status)
function showStatusOverlay(message) {
  const statusOverlay = document.getElementById('statusOverlay');
  if (statusOverlay) {
    statusOverlay.innerHTML = `<p>${message}</p>`;
    statusOverlay.classList.add('visible');
  }
}

function hideStatusOverlay() {
  const statusOverlay = document.getElementById('statusOverlay');
  if (statusOverlay) {
    statusOverlay.classList.remove('visible');
  }
}

// Scanning overlay functions
function showScanningOverlay() {
  const scanningOverlay = document.getElementById('scanningOverlay');
  console.log('🔍 Attempting to SHOW scanning overlay:', scanningOverlay);
  if (scanningOverlay) {
    scanningOverlay.classList.add('visible');
    console.log('✅ Scanning overlay visible class ADDED');
    console.log('📊 Scanning overlay computed style after show:', window.getComputedStyle(scanningOverlay).opacity);
  } else {
    console.error('❌ Scanning overlay element not found!');
  }
}

function hideScanningOverlay() {
  const scanningOverlay = document.getElementById('scanningOverlay');
  console.log('🔍 Attempting to HIDE scanning overlay:', scanningOverlay);
  if (scanningOverlay) {
    scanningOverlay.classList.remove('visible');
    console.log('✅ Scanning overlay visible class REMOVED');
    console.log('📊 Scanning overlay computed style after hide:', window.getComputedStyle(scanningOverlay).opacity);
  } else {
    console.error('❌ Scanning overlay element not found!');
  }
}

// Generation overlay functions
function showGenerationOverlay() {
  const generationOverlay = document.getElementById('generationOverlay');
  console.log('🎬 Attempting to show generation overlay:', generationOverlay);
  if (generationOverlay) {
    generationOverlay.innerHTML = `
      <div class="generation-content">
        <div class="generation-title">Generation Started!</div>
        <div class="generation-subtitle">Here are some dog facts while you wait...</div>
      </div>
    `;
    generationOverlay.classList.add('visible');
    console.log('✅ Generation overlay visible class added');
  } else {
    console.error('❌ Generation overlay element not found!');
  }
}

function hideGenerationOverlay() {
  const generationOverlay = document.getElementById('generationOverlay');
  console.log('🎬 Attempting to hide generation overlay:', generationOverlay);
  if (generationOverlay) {
    generationOverlay.classList.remove('visible');
    console.log('✅ Generation overlay visible class removed');
  } else {
    console.error('❌ Generation overlay element not found!');
  }
}

// Make all overlay functions globally available
window.showStatusOverlay = showStatusOverlay;
window.hideStatusOverlay = hideStatusOverlay;
window.showScanningOverlay = showScanningOverlay;
window.hideScanningOverlay = hideScanningOverlay;
window.showGenerationOverlay = showGenerationOverlay;
window.hideGenerationOverlay = hideGenerationOverlay;

// DROPDOWN LOGIC HANDLERS
function handleDropdownChange(dropdownId, value, text) {
  console.log(`🔧 ${dropdownId} changed to: ${value} (${text})`);
  
  // Handle texture change for PBR visibility
  if (dropdownId === 'textureDropdown') {
    if (value === 'true') {
      showPBRControls();
    } else {
      hidePBRControls();
    }
  }
  
  // Update global variables
  if (dropdownId === 'symmetryDropdown') {
    window.selectedSymmetry = value;
  } else if (dropdownId === 'topologyDropdown') {
    window.selectedTopology = value;
  } else if (dropdownId === 'textureDropdown') {
    window.selectedTexture = value;
  }
}

function triggerHiddenButton(dropdownId, value) {
  // Trigger the corresponding hidden buttons for compatibility with existing code
  let buttonSelector = '';
  let dataAttribute = '';
  
  switch(dropdownId) {
    case 'symmetryDropdown':
      buttonSelector = '.symmetry-btn';
      dataAttribute = 'data-symmetry';
      break;
    case 'topologyDropdown':
      buttonSelector = '.topology-btn';
      dataAttribute = 'data-topology';
      break;
    case 'textureDropdown':
      buttonSelector = '.texture-btn';
      dataAttribute = 'data-texture';
      break;
  }
  
  if (buttonSelector) {
    // Remove selected class from all buttons
    document.querySelectorAll(buttonSelector).forEach(btn => {
      btn.classList.remove('selected', 'active');
    });
    
    // Add selected class to matching button
    const targetButton = document.querySelector(`${buttonSelector}[${dataAttribute}="${value}"]`);
    if (targetButton) {
      targetButton.classList.add('selected', 'active');
      
      // Trigger click event for compatibility (but prevent infinite loops)
      setTimeout(() => {
        // Create a custom event to avoid infinite loops
        const customEvent = new Event('click', { bubbles: true });
        customEvent.fromDropdown = true; // Mark this as coming from dropdown
        targetButton.dispatchEvent(customEvent);
      }, 10);
    }
  }
}

function setDefaultSelections() {
  // Set default values and trigger corresponding buttons
  const defaults = [
    { dropdownId: 'symmetryDropdown', value: 'auto', text: 'Auto' },
    { dropdownId: 'topologyDropdown', value: 'triangle', text: 'Triangles' },
    { dropdownId: 'textureDropdown', value: 'true', text: 'Yes' }
  ];
  
  defaults.forEach(({ dropdownId, value, text }) => {
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
      const valueElement = dropdown.querySelector('.dropdown-value');
      const option = dropdown.querySelector(`[data-value="${value}"]`);
      
      if (valueElement && option) {
        valueElement.textContent = text;
        option.classList.add('selected');
        handleDropdownChange(dropdownId, value, text);
        triggerHiddenButton(dropdownId, value);
      }
    }
  });
  
  // Add visual feedback for disabled state
  updateDropdownDisabledState();
}

// Add function to update disabled state visual feedback
function updateDropdownDisabledState() {
  const controlsSidebar = document.querySelector('.controls-sidebar');
  const isDisabled = controlsSidebar && controlsSidebar.classList.contains('disabled');
  
  // Update dropdown displays to show disabled state
  document.querySelectorAll('.dropdown-control .dropdown-display').forEach(display => {
    if (isDisabled) {
      display.style.opacity = '0.3';
      display.style.cursor = 'not-allowed';
      display.title = 'Upload an image first to enable controls';
    } else {
      display.style.opacity = '1';
      display.style.cursor = 'pointer';
      display.title = '';
    }
  });
  
  // FIXED: Update polycount controls disabled state
  const polycountSlider = document.getElementById('polycountSlider');
  const polycountInput = document.getElementById('polycountInput');
  
  if (polycountSlider) {
    if (isDisabled) {
      polycountSlider.disabled = true;
      polycountSlider.style.opacity = '0.3';
      polycountSlider.style.cursor = 'not-allowed';
      polycountSlider.title = 'Upload an image first to enable controls';
    } else {
      polycountSlider.disabled = false;
      polycountSlider.style.opacity = '1';
      polycountSlider.style.cursor = 'pointer';
      polycountSlider.title = '';
    }
  }
  
  if (polycountInput) {
    if (isDisabled) {
      polycountInput.disabled = true;
      polycountInput.style.opacity = '0.3';
      polycountInput.style.cursor = 'not-allowed';
      polycountInput.title = 'Upload an image first to enable controls';
    } else {
      polycountInput.disabled = false;
      polycountInput.style.opacity = '1';
      polycountInput.style.cursor = 'text';
      polycountInput.title = '';
    }
  }
}

function showPBRControls() {
  const pbrButtons = document.getElementById("pbrButtons");
  if (pbrButtons) {
    pbrButtons.style.display = "flex";
    setTimeout(() => {
      pbrButtons.classList.add('visible');
    }, 10);
  }
}

function hidePBRControls() {
  const pbrButtons = document.getElementById("pbrButtons");
  const pbrCheckbox = document.getElementById("pbrCheckbox");
  
  if (pbrButtons) {
    pbrButtons.classList.remove('visible');
    setTimeout(() => {
      pbrButtons.style.display = "none";
    }, 300);
  }
  
  // Reset PBR when hidden
  if (pbrCheckbox) {
    pbrCheckbox.checked = false;
  }
  window.enablePBR = false;
}

function showStatusMessage(message) {
  const statusElement = document.getElementById("statusMsg");
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.classList.add('visible');
  }
}

function hideStatusMessage() {
  const statusElement = document.getElementById("statusMsg");
  if (statusElement) {
    statusElement.classList.remove('visible');
  }
}

function showProgressSection() {
  const progressSection = document.querySelector(".progress-section");
  const spinnerContainer = document.getElementById("spinnerContainer");
  
  if (progressSection) {
    progressSection.classList.add('visible');
  }
  
  if (spinnerContainer) {
    spinnerContainer.style.display = 'flex';
  }
}

function hideProgressSection() {
  const progressSection = document.querySelector(".progress-section");
  const spinnerContainer = document.getElementById("spinnerContainer");
  
  if (progressSection) {
    progressSection.classList.remove('visible');
  }
  
  if (spinnerContainer) {
    spinnerContainer.style.display = 'none';
  }
}

function showDownloadButtons() {
  const actionButtons = document.querySelector(".action-buttons");
  if (actionButtons) {
    // Add the downloads-ready class to enable the download button
    actionButtons.classList.add("downloads-ready");
    
    // Add a brief initial pulse to draw attention, then permanent glow
    setTimeout(() => {
      const downloadTrigger = actionButtons.querySelector('.download-trigger');
      if (downloadTrigger) {
        // Add a temporary pulse effect to draw attention
        downloadTrigger.style.animation = 'pulse 0.6s ease-out 3';
        
        // After pulse, remove animation (permanent glow will show)
        setTimeout(() => {
          downloadTrigger.style.animation = '';
        }, 1800); // 3 pulses
      }
    }, 100);
    
    console.log("📥 Download dropdown enabled with permanent glow");
  }
}

// Add pulse animation to CSS via JavaScript
if (!document.getElementById('pulseAnimation')) {
  const style = document.createElement('style');
  style.id = 'pulseAnimation';
  style.textContent = `
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
}

function hideDownloadButtons() {
  const actionButtons = document.querySelector(".action-buttons");
  if (actionButtons) {
    actionButtons.classList.remove("downloads-ready");
  }
}

function showActionButtons() {
  const actionButtons = document.querySelector(".action-buttons");
  if (actionButtons) {
    actionButtons.classList.add("visible");
    console.log("🎬 Action buttons shown");
  }
}

function hideActionButtons() {
  const actionButtons = document.querySelector(".action-buttons");
  if (actionButtons) {
    actionButtons.classList.remove("visible");
    actionButtons.classList.remove("downloads-ready");
  }
}

// ENHANCED TEST FUNCTIONS
window.testNuclearDropdowns = function() {
    console.log('🧪 Testing nuclear dropdowns...');
    
    const dropdowns = ['symmetryDropdown', 'topologyDropdown', 'textureDropdown'];
    
    dropdowns.forEach((id, index) => {
        setTimeout(() => {
            console.log(`Testing nuclear dropdown: ${id}`);
            const dropdown = document.getElementById(id);
            const display = dropdown.querySelector('.dropdown-display');
            if (display) {
                display.click();
                
                setTimeout(() => {
                    display.click(); // Close it
                }, 2000);
            }
        }, index * 3000);
    });
};

window.testNuclearDownloadDropdown = function() {
    console.log('🧪 Testing nuclear download dropdown...');
    const trigger = document.querySelector('.download-trigger');
    if (trigger) {
        // First make sure downloads are ready
        const actionButtons = document.querySelector('.action-buttons');
        if (actionButtons) {
            actionButtons.classList.add('downloads-ready');
        }
        
        trigger.click();
        
        setTimeout(() => {
            trigger.click(); // Close it
        }, 3000);
    }
};

window.testNuclearPositioning = function() {
    console.log('🧪 Testing nuclear positioning on current screen size...');
    console.log(`🧪 Viewport: ${window.innerWidth}x${window.innerHeight}`);
    console.log(`🧪 Device pixel ratio: ${window.devicePixelRatio}`);
    console.log(`🧪 Scroll position: ${window.pageXOffset}, ${window.pageYOffset}`);
    
    // Test each dropdown
    const dropdowns = ['symmetryDropdown', 'topologyDropdown', 'textureDropdown'];
    
    dropdowns.forEach((id, index) => {
        setTimeout(() => {
            console.log(`\n🧪 Testing ${id}...`);
            const dropdown = document.getElementById(id);
            const display = dropdown.querySelector('.dropdown-display');
            const rect = display.getBoundingClientRect();
            
            console.log(`🧪 ${id} trigger position:`, rect);
            
            // Trigger the dropdown
            display.click();
            
            setTimeout(() => {
                // Close it
                display.click();
            }, 2000);
        }, index * 3000);
    });
};

// Make nuclear functions globally available
window.initDropdownsNuclear = initDropdownsNuclear;
window.closeAllNuclearDropdowns = closeAllNuclearDropdowns;

// WINDOW RESIZE AND SCROLL HANDLERS - Close dropdowns on any viewport change
window.addEventListener('resize', () => {
    console.log('🔄 Window resized, closing all nuclear dropdowns');
    closeAllNuclearDropdowns();
});

window.addEventListener('scroll', () => {
    console.log('🔄 Window scrolled, closing all nuclear dropdowns');
    closeAllNuclearDropdowns();
});

// Close dropdowns on any viewport change that could affect positioning
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        console.log('🔄 Orientation changed, closing all nuclear dropdowns');
        closeAllNuclearDropdowns();
    }, 100);
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Only initialize if we're on the generation page (has controls sidebar)
  if (document.querySelector('.controls-sidebar')) {
    console.log("🔄 Initializing flow with CORRECTED NUCLEAR DROPDOWNS...");
    initFlow(); // This now uses nuclear dropdowns internally
    
    // Add enhanced test functions to window for debugging
    window.testScanningOverlay = function() {
      console.log('🧪 Testing scanning overlay...');
      const scanningOverlay = document.getElementById('scanningOverlay');
      console.log('🧪 Element found:', scanningOverlay);
      console.log('🧪 Initial computed style:', window.getComputedStyle(scanningOverlay).opacity);
      
      showScanningOverlay();
      console.log('🧪 After show - computed style:', window.getComputedStyle(scanningOverlay).opacity);
      console.log('🧪 After show - classes:', scanningOverlay.classList.toString());
      
      setTimeout(() => {
        hideScanningOverlay();
        console.log('🧪 After hide - computed style:', window.getComputedStyle(scanningOverlay).opacity);
        console.log('🧪 Scanning overlay test complete');
      }, 3000);
    };
    
    window.testGenerationOverlay = function() {
      console.log('🧪 Testing generation overlay...');
      showGenerationOverlay();
      setTimeout(() => {
        hideGenerationOverlay();
        console.log('🧪 Generation overlay test complete');
      }, 3000);
    };
    
    console.log('🧪 CORRECTED NUCLEAR DROPDOWN test functions available:');
    console.log('  - testScanningOverlay() - Test scanning overlay');
    console.log('  - testGenerationOverlay() - Test generation overlay');
    console.log('  - testNuclearDropdowns() - Test all control dropdowns');
    console.log('  - testNuclearDownloadDropdown() - Test download dropdown');
    console.log('  - testNuclearPositioning() - Test positioning on current screen');
    console.log('  - closeAllNuclearDropdowns() - Close all dropdowns');
  }
});