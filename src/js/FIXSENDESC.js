function getEscalationByIdSafe(escalationId) {
  return (window.escalationSystem?.escalations || []).find(
    e =>
      String(e.id) === String(escalationId) ||
      String(e.dbId) === String(escalationId)
  ) || null;
}



async sendDeviationToDatabase(deviation) {
  try {
    const escalationId = deviation.escalationId;
    const backendFailureId = deviation.failureDbId;

    if (!escalationId) {
      console.error('Escalation ID is required to send deviation to database');
      throw new Error('Escalation ID is required');
    }

    const failure = await this.fetchFailureById(escalationId);
    if (!failure) {
      console.error(`Cannot send deviation to database - escalation ${escalationId} not found in DB`);
      showTemporaryMessage('Failed to send deviation: failure not found', 'error');
      return null;
    }

    const failureId = backendFailureId || failure.dbId;
    if (!failureId) {
      console.error('Backend failure ID could not be resolved');
      showTemporaryMessage('Failed to send deviation: backend failure id missing', 'error');
      return null;
    }

    const payload = {
      failureId: failureId,
      description: deviation.description,
      justification: deviation.justification ?? null,
      status: deviation.status,
      createdAt: deviation.createdAt ? new Date(deviation.createdAt).toISOString() : undefined,
      updatedAt: new Date().toISOString(),
      expiryDate: deviation.expiryDate ? new Date(deviation.expiryDate).toISOString() : undefined
    };

    const response = await fetch(`http://127.0.0.1:5000/api/integrity_test/action?id=${encodeURIComponent(failureId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${await response.text().catch(() => '')}`);
    }

    const result = await response.json();
    console.log('Deviation saved to database:', result);

    if (result && result.id && !deviation.dbId) {
      deviation.dbId = result.id;
    }

    return result;
  } catch (error) {
    console.error('Failed to save deviation to database:', error);
    showTemporaryMessage('Warning: Failed to save deviation to database; kept in current session', 'warning');
    throw error;
  }
}
