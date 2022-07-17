SampleApp = (function () {
    var latestEnrollmentIdentifier = "";
    var latestProcessor;
    var latestSessionResult = null;
    var latestIDScanResult = null;
    // Wait for onload to be complete before attempting to access the Browser SDK.
    window.onload = function () {
        SampleAppUtilities.formatUIForDevice();
        // Set a the directory path for other FaceTec Browser SDK Resources.
        FaceTecSDK.setResourceDirectory("../../core-sdk/FaceTecSDK.js/resources");
        // Set the directory path for required FaceTec Browser SDK images.
        FaceTecSDK.setImagesDirectory("../../core-sdk/FaceTec_images");
        // Set your FaceTec Device SDK Customizations.
        ThemeHelpers.setAppTheme(ThemeHelpers.getCurrentTheme());
        // Initialize FaceTec Browser SDK and configure the UI features.
        Config.initializeFromAutogeneratedConfig(FaceTecSDK, function (initializedSuccessfully) {
            if (initializedSuccessfully) {
                SampleAppUtilities.enableControlButtons();
                // Set the sound files that are to be used for Vocal Guidance.
                SampleAppUtilities.setVocalGuidanceSoundFiles();
                // Set the strings to be used for group names, field names, and placeholder texts for the FaceTec ID Scan User OCR Confirmation Screen.
                SampleAppUtilities.setOCRLocalization();
                AdditionalScreens.setServerUpgradeStyling(document.getElementById("controls"), exitAdditionalScreen);
            }
            SampleAppUtilities.displayStatus(FaceTecSDK.getFriendlyDescriptionForFaceTecSDKStatus(FaceTecSDK.getStatus()));
        });
    };

    // Valdemar - método criado para demonstrar a obtenção do session=token da Facetec
    function onGetSessionTokenPressed() {
        console.log("onGetSessionTokenPressed pressed")
        getSessionToken((sessionToken) => {
            console.log(`sessionToken=${sessionToken}`)
            alert(`sessionToken = ${sessionToken}`)
        })
    }

    // Initiate a 3D Liveness Check.
    function onLivenessCheckPressed() {
        SampleAppUtilities.fadeOutMainUIAndPrepareForSession();
        // Get a Session Token from the FaceTec SDK, then start the 3D Liveness Check.
        getSessionToken(function (sessionToken) {
            latestProcessor = new LivenessCheckProcessor(sessionToken, SampleApp);
        });
    }
    // Initiate a 3D Liveness Check, then storing the 3D FaceMap in the Database, also known as "Enrollment".  A random enrollmentIdentifier is generated each time to guarantee uniqueness.
    function onEnrollUserPressed() {
        SampleAppUtilities.fadeOutMainUIAndPrepareForSession();
        // Get a Session Token from the FaceTec SDK, then start the Enrollment.
        getSessionToken(function (sessionToken) {
            latestEnrollmentIdentifier = "browser_sample_app_" + SampleAppUtilities.generateUUId();
            latestProcessor = new EnrollmentProcessor(sessionToken, SampleApp);
        });
    }
    // Perform 3D to 3D Authentication against the Enrollment previously performed.
    function onAuthenticateUserPressed() {
        // For demonstration purposes, verify that we have an enrollmentIdentifier to Authenticate against.
        if (latestEnrollmentIdentifier.length === 0) {
            SampleAppUtilities.displayStatus("Please enroll first before trying authentication.");
        }
        else {
            SampleAppUtilities.fadeOutMainUIAndPrepareForSession();
            // Get a Session Token from the FaceTec SDK, then start the 3D to 3D Matching.
            getSessionToken(function (sessionToken) {
                latestProcessor = new AuthenticateProcessor(sessionToken, SampleApp);
            });
        }
    }
    // Perform a 3D Liveness Check, then an ID Scan, then Match the 3D FaceMap to the ID Scan.
    function onPhotoIDMatchPressed() {
        SampleAppUtilities.fadeOutMainUIAndPrepareForSession();
        // Get a Session Token from the FaceTec SDK, then start the 3D Liveness Check.  On Success, ID Scanning will start automatically.
        getSessionToken(function (sessionToken) {
            latestEnrollmentIdentifier = "browser_sample_app_" + SampleAppUtilities.generateUUId();
            latestProcessor = new PhotoIDMatchProcessor(sessionToken, SampleApp);
        });
    }
    // Show the final result with the Session Review Screen.
    var onComplete;
    onComplete = function (sessionResult, idScanResult, latestNetworkResponseStatus) {
        latestSessionResult = sessionResult;
        latestIDScanResult = idScanResult;
        if (!latestProcessor.isSuccess()) {
            // Check for server offline
            if (isNetworkResponseServerIsOffline(latestNetworkResponseStatus) === true) {
                showAdditionalScreensServerIsDown();
                return;
            }
        }
        SampleAppUtilities.displayStatus("See logs for more details.");
        SampleAppUtilities.showMainUI();
    };
    // Check for server down status
    function isNetworkResponseServerIsOffline(networkResponseStatus) {
        return (networkResponseStatus >= 500);
    }
    // Set a new customization for FaceTec Browser SDK.
    function onDesignShowcasePressed() {
        ThemeHelpers.showNewTheme();
    }
    function onVocalGuidanceSettingsButtonPressed() {
        SampleAppUtilities.setVocalGuidanceMode();
    }
    // Display audit trail images captured from user's last FaceTec Browser SDK Session (if available).
    function onViewAuditTrailPressed() {
        SampleAppUtilities.showAuditTrailImages(latestSessionResult, latestIDScanResult);
    }
    // Get the Session Token from the server
    function getSessionToken(sessionTokenCallback) {
        // Only handle session token error once
        var sessionTokenErrorHasBeenHandled = false;
        var XHR = new XMLHttpRequest();
        XHR.open("GET", Config.BaseURL + "/session-token");
        XHR.setRequestHeader("X-Device-Key", Config.DeviceKeyIdentifier);
        XHR.setRequestHeader("X-User-Agent", FaceTecSDK.createFaceTecAPIUserAgentString(""));
        XHR.onreadystatechange = function () {
            if (this.readyState === XMLHttpRequest.DONE) {
                var sessionToken = "";
                try {
                    // Attempt to get the sessionToken from the response object.
                    sessionToken = JSON.parse(this.responseText).sessionToken;
                    // Something went wrong in parsing the response. Return an error.
                    if (typeof sessionToken !== "string") {
                        if (sessionTokenErrorHasBeenHandled === false) {
                            sessionTokenErrorHasBeenHandled = true;
                            if (isNetworkResponseServerIsOffline(XHR.status)) {
                                showAdditionalScreensServerIsDown();
                            }
                            else {
                                onServerSessionTokenError();
                            }
                        }
                        return;
                    }
                }
                catch (_a) {
                    // Something went wrong in parsing the response. Return an error.
                    if (sessionTokenErrorHasBeenHandled === false) {
                        sessionTokenErrorHasBeenHandled = true;
                        if (isNetworkResponseServerIsOffline(XHR.status)) {
                            showAdditionalScreensServerIsDown();
                        }
                        else {
                            onServerSessionTokenError();
                        }
                    }
                    return;
                }
                SampleAppUtilities.hideLoadingSessionToken();
                sessionTokenCallback(sessionToken);
            }
        };
        // Wait 3s, if the request is not completed yet, show the session token loading screen
        window.setTimeout(function () {
            if (XHR.readyState !== XMLHttpRequest.DONE) {
                SampleAppUtilities.showLoadingSessionToken();
            }
        }, 3000);
        XHR.onerror = function () {
            // Something went wrong in the XHR request
            if (sessionTokenErrorHasBeenHandled === false) {
                sessionTokenErrorHasBeenHandled = true;
                if (isNetworkResponseServerIsOffline(XHR.status)) {
                    showAdditionalScreensServerIsDown();
                }
                else {
                    onServerSessionTokenError();
                }
            }
        };
        XHR.send();
    }
    function showAdditionalScreensServerIsDown() {
        AdditionalScreens.showServerUpGradeView();
    }
    function onServerSessionTokenError() {
        SampleAppUtilities.handleErrorGettingServerSessionToken();
    }
    var getLatestEnrollmentIdentifier;
    getLatestEnrollmentIdentifier = function () {
        return latestEnrollmentIdentifier;
    };
    var clearLatestEnrollmentIdentifier;
    clearLatestEnrollmentIdentifier = function () {
        latestEnrollmentIdentifier = "";
    };
    function exitAdditionalScreen() {
        AdditionalScreens.exitAdditionalScreen(SampleAppUtilities.showMainUI);
    }
    return {
        onLivenessCheckPressed: onLivenessCheckPressed,
        onGetSessionTokenPressed: onGetSessionTokenPressed,
        onEnrollUserPressed: onEnrollUserPressed,
        onAuthenticateUserPressed: onAuthenticateUserPressed,
        onPhotoIDMatchPressed: onPhotoIDMatchPressed,
        onDesignShowcasePressed: onDesignShowcasePressed,
        onComplete: onComplete,
        getLatestEnrollmentIdentifier: getLatestEnrollmentIdentifier,
        clearLatestEnrollmentIdentifier: clearLatestEnrollmentIdentifier,
        onVocalGuidanceSettingsButtonPressed: onVocalGuidanceSettingsButtonPressed,
        onViewAuditTrailPressed: onViewAuditTrailPressed,
        latestSessionResult: latestSessionResult,
        latestIDScanResult: latestIDScanResult
    };
})();
