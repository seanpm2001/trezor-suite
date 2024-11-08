import { useMemo } from 'react';

import { selectAnalyticsInstanceId } from '@suite-common/analytics';
import { selectExperimentById } from '@suite-common/message-system';

import { useSelector } from 'src/hooks/suite';
import { selectActiveExperimentGroup } from 'src/utils/suite/experiment';

export const useExperiment = (id: string) => {
    const state = useSelector(state => state);
    const instanceId = selectAnalyticsInstanceId(state);
    const experiment = useSelector(selectExperimentById(id));
    const activeExperimentVariant = useMemo(
        () => selectActiveExperimentGroup({ instanceId, experiment }),
        [instanceId, experiment],
    );

    return {
        experiment,
        activeExperimentVariant,
    };
};
