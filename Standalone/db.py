from sqlalchemy import create_engine, text

ORACLE_DSN = 'oracle+cx_oracle://@10.226.14.79:5000'
engine = create_engine(ORACLE_DSN)

def get_tree_types():
    sql = text("SELECT ID, TREE_TYPE FROM TREE_TYPES WHERE STATUS = 'active'")
    with engine.connect() as conn:
        result = conn.execute(sql)
        return [{"id": row[0], "treeType": row[1]} for row in result]

def get_wells():
    sql = text("""
        SELECT W.ID, W.NAME, W.TYPE, W.STATUS, W.CREATED, W.UPDATED,
               T.ID AS TREE_TYPE_ID, T.TREE_TYPE
        FROM WELLS W
        LEFT JOIN TREE_TYPES T ON W.WELLHEAD = T.ID
    """)
    with engine.connect() as conn:
        result = conn.execute(sql)
        return [
            {
                "id": row.ID,
                "name": row.NAME,
                "type": row.TYPE,
                "status": row.STATUS,
                "created": str(row.CREATED) if row.CREATED else "",
                "updated": str(row.UPDATED) if row.UPDATED else "",
                "treeTypeId": row.TREE_TYPE_ID,
                "treeType": row.TREE_TYPE
            }
            for row in result
        ]

def get_well_by_id(well_id):
    sql = text("""
        SELECT W.ID, W.NAME, W.TYPE, W.WELLHEAD, T.TREE_TYPE
        FROM WELLS W
        LEFT JOIN TREE_TYPES T ON W.WELLHEAD = T.ID
        WHERE W.ID = :well_id
    """)
    with engine.connect() as conn:
        row = conn.execute(sql, {'well_id': well_id}).fetchone()
        if not row:
            return None
        return {
            "id": row.ID,
            "name": row.NAME,
            "type": row.TYPE,
            "wellhead": row.WELLHEAD,
            "treeType": row.TREE_TYPE
        }

def create_well(well_id, name, well_type, tree_type_id, status='active'):
    sql = text("""
        INSERT INTO WELLS (ID, NAME, TYPE, WELLHEAD, STATUS, CREATED, UPDATED)
        VALUES (:id, :name, :type, :wellhead, :status, SYSDATE, SYSDATE)
    """)
    with engine.begin() as conn:
        # Check if well exists
        exists = conn.execute(text("SELECT 1 FROM WELLS WHERE ID = :id"), {'id': well_id}).fetchone()
        if exists:
            raise Exception(f"Well with ID '{well_id}' already exists")
        conn.execute(sql, {
            "id": well_id,
            "name": name,
            "type": well_type,
            "wellhead": tree_type_id,
            "status": status
        })