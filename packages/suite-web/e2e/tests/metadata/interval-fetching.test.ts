// @group_metadata
// @retry=2

import * as METADATA_LABELING from '@trezor/suite/src/actions/suite/constants/metadataLabelingConstants';

import { rerouteMetadataToMockProvider, stubOpen } from '../../stubs/metadata';

const fixtures = [
    {
        provider: 'google',
        desc: 'does NOT watch files over time',
        file: 'f7acc942eeb83921892a95085e409b3e6b5325db6400ae5d8de523a305291dca.mtdt',
        content: 'already existing label',
    },
    {
        provider: 'dropbox',
        desc: 'does watch files over time',
        file: '/f7acc942eeb83921892a95085e409b3e6b5325db6400ae5d8de523a305291dca.mtdt',
        content: 'label from another window',
    },
] as const;

describe('Metadata - suite is watching cloud provider and syncs periodically', () => {
    beforeEach(() => {
        cy.viewport('macbook-13').resetDb();
    });
    fixtures.forEach(f => {
        it(`${f.provider}-${f.desc}`, () => {
            // prepare test
            cy.task('startEmu', { wipe: true });
            cy.task('setupEmu', { mnemonic: 'mnemonic_all' });
            cy.task('startBridge');
            cy.prefixedVisit('/', {
                onBeforeLoad: win => {
                    cy.stub(win, 'open').callsFake(stubOpen(win));
                    cy.stub(win, 'fetch').callsFake(rerouteMetadataToMockProvider);
                },
            });
            cy.getTestElement('@welcome-layout/body', { timeout: 30_000 });
            cy.task('metadataStartProvider', f.provider);

            // prepare some initial files
            cy.task('metadataSetFileContent', {
                provider: f.provider,
                file: f.file,
                content: {
                    version: '1.0.0',
                    accountLabel: 'already existing label',
                    outputLabels: {},
                    addressLabels: {},
                },
                aesKey: 'c785ef250807166bffc141960c525df97647fcc1bca57f6892ca3742ba86ed8d',
            });
            cy.disableFirmwareHashCheck();
            cy.clock();
            cy.tick(1000);
            cy.getTestElement('@analytics/continue-button', { timeout: 30_000 }).click();
            cy.getTestElement('@onboarding/exit-app-button').click();
            cy.getTestElement('@onboarding/viewOnly/enable').click();
            cy.log(
                'Wait for discovery to finish. There is "add label" button, but no actual metadata appeared',
            );
            cy.discoveryShouldFinish();
            cy.getTestElement('@account-menu/btc/normal/0').click();

            cy.getTestElement("@metadata/accountLabel/m/84'/0'/0'/add-label-button").click({
                force: true,
            });
            cy.passThroughInitMetadata(f.provider);

            cy.log('Already existing label gets loaded');
            cy.getTestElement('@account-menu/btc/normal/0/label').should(
                'contain',
                'already existing label',
            );
            // now change data in provider and fast forward time, see if it updated
            cy.task('metadataSetFileContent', {
                provider: f.provider,
                file: f.file,
                content: {
                    version: '1.0.0',
                    accountLabel: 'label from another window',
                    outputLabels: {},
                    addressLabels: {},
                },
                aesKey: 'c785ef250807166bffc141960c525df97647fcc1bca57f6892ca3742ba86ed8d',
            });
            // and this does the time travel to trigger fetch
            cy.tick(METADATA_LABELING.FETCH_INTERVAL);
            cy.getTestElement('@account-menu/btc/normal/0/label').should('contain', f.content);
        });
    });
});
